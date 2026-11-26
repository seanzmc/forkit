import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  AppState,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { DishCard } from "@/components/DishCard";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import type { Deck, Dish, Meal } from "@/lib/food-data";
import { SwipeReview } from "@/components/SwipeReview";
import { SessionPanel } from "@/components/SessionPanel";
import { getSwipes, recordSwipe, resetSwipes, undoSwipe } from "@/lib/swipe-review";
import { getPushToken } from "@/lib/push";
import { getWsUrl, type SessionState, type WsMessage } from "@/lib/websocket";
import * as Crypto from "expo-crypto";

// Same reconnect policy as the lobby: backoff before each attempt, then a
// Retry button. The server answers every 20 s ping, so 45 s of silence means
// the socket is dead even if it still reports OPEN.
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 8000];
const SILENCE_LIMIT_MS = 45000;
const PING_INTERVAL_MS = 20000;

// One card per restaurant (per recipe in cook-in): its dishes are what the
// deck is about, and it's easier to judge a place with all of them in hand.
// A room dealt by dish gets one card per dish, in the server's order, which
// keeps the same place from coming up twice in a row.
function groupCards(dishes: Dish[], byDish: boolean): Dish[][] {
  if (byDish) return dishes.map((d) => [d]);
  const groups = new Map<string, Dish[]>();
  for (const dish of dishes) {
    const key = dish.mode === "cook-in" ? dish.id : (dish.placeId ?? dish.restaurant);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(dish);
  }
  return [...groups.values()];
}

const MEAL_QUESTION: Record<Meal, string> = {
  breakfast: "What's for breakfast?",
  lunch: "What's for lunch?",
  dinner: "What's for dinner?",
};

export default function SwipeScreen() {
  const {
    code,
    userId: paramUserId,
    dishes: dishesParam,
    deck: deckParam,
  } = useLocalSearchParams<{
    code: string;
    userId: string;
    dishes: string;
    deck?: Deck;
  }>();
  const insets = useSafeAreaInsets();
  const { height } = useSafeAreaFrame();

  const [dishes, setDishes] = useState<Dish[]>(() => {
    try { return JSON.parse(dishesParam ?? "[]"); } catch { return []; }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setSwipedCount] = useState(0);
  // Swipe counts for the other members, from their swipe_update broadcasts.
  const [memberSwipes, setMemberSwipes] = useState<Record<string, number>>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [swipeHistory, setSwipeHistory] = useState<{ dishId: string; vote: "like" | "pass" }[]>([]);
  // Which of the top card's dishes is showing.
  const [dishIndex, setDishIndex] = useState(0);
  // In every room until the member's first flip there. Remembering it per
  // device hid it for good after one flip, even months and many rooms later.
  const [showDishHint, setShowDishHint] = useState(true);
  const handleDishFlip = useCallback((index: number) => {
    setDishIndex(index);
    setShowDishHint(false);
  }, []);
  // The lobby passes the room's deck along so the first render already deals
  // it right; the server's session has the final word.
  const byDish = (session?.deck ?? deckParam) === "dishes";
  const cards = useMemo(() => groupCards(dishes, byDish), [dishes, byDish]);
  // Kept in state: a fresh id on every render would reconnect on every render.
  const [userId] = useState(() => paramUserId ?? Crypto.randomUUID());
  const [status, setStatus] = useState<"connecting" | "connected" | "reconnecting" | "offline">(
    "connecting"
  );
  // Someone asked for another round and its deck is on the way.
  const [roundLoading, setRoundLoading] = useState(false);
  // The round this screen's deck and swipes are from. A ref so the join
  // that a reconnect sends has the current one.
  const roundRef = useRef(1);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const joinedRef = useRef(false);
  // Set when we close the socket on purpose (leaving, or the room is gone) so
  // onclose doesn't try to reconnect.
  const closingRef = useRef(false);
  // When the current socket last received anything. A ref so coming back to
  // the foreground can restart the silence window.
  const lastHeardRef = useRef(0);
  // The retry timer calls the latest connect through this ref; a callback
  // can't name itself before its declaration finishes.
  const connectWsRef = useRef<() => void>(() => {});

  // Other members' progress as the server counts it, so a reconnect picks up
  // the swipe_updates missed while the socket was down.
  const syncProgress = useCallback((s: SessionState) => {
    if (s.members.some((m) => m.swiped === undefined)) return;
    setMemberSwipes(Object.fromEntries(s.members.map((m) => [m.id, m.swiped ?? 0])));
  }, []);

  // A fresh deck for everyone: no one has swiped any of it yet.
  const startRound = useCallback(
    (s: SessionState, deck: Dish[]) => {
      roundRef.current = s.round ?? 1;
      resetSwipes();
      setSwipeHistory([]);
      setSwipedCount(0);
      setCurrentIndex(0);
      setDishIndex(0);
      setDishes(deck);
      setSession(s);
      syncProgress(s);
      setRoundLoading(false);
    },
    [syncProgress]
  );

  const connectWs = useCallback(async () => {
    const name = await AsyncStorage.getItem("userName");
    if (!name || closingRef.current) return;

    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    lastHeardRef.current = Date.now();

    const handleDrop = () => {
      if (wsRef.current !== ws) return;
      if (pingRef.current) clearInterval(pingRef.current);
      if (closingRef.current) return;
      if (attemptsRef.current >= RECONNECT_DELAYS_MS.length) {
        setStatus("offline");
        return;
      }
      setStatus("reconnecting");
      const delay = RECONNECT_DELAYS_MS[attemptsRef.current++];
      retryRef.current = setTimeout(() => connectWsRef.current(), delay);
    };

    ws.onopen = () => {
      // On a reconnect, send every swipe made so far, including any made or
      // undone while offline; they replace what the server holds. The first
      // join sends none, so after the app was restarted the server keeps
      // the swipes it already has for this member.
      const swipes = joinedRef.current
        ? Object.fromEntries(getSwipes().map((s) => [s.dish.id, s.vote]))
        : undefined;
      ws.send(
        JSON.stringify({
          type: "join",
          code: code?.toUpperCase(),
          userId,
          name,
          swipes,
          supportsSwipeCounts: true,
          round: roundRef.current,
        })
      );
      // Registered separately so a slow permission prompt or APNs lookup
      // never delays joining and a late token still reaches the server.
      getPushToken().then((pushToken) => {
        if (pushToken && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "push_token", pushToken }));
        }
      });
      if (pingRef.current) clearInterval(pingRef.current);
      let lastTick = Date.now();
      pingRef.current = setInterval(() => {
        const now = Date.now();
        const late = now - lastTick > PING_INTERVAL_MS * 1.5;
        lastTick = now;
        if (late) {
          // Timers were suspended in the background, so the silence is ours,
          // not the server's. Give the socket a fresh window and a ping to
          // answer instead of closing a healthy one (for the last member of
          // a lobby, closing it deletes the room).
          lastHeardRef.current = now;
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        } else if (now - lastHeardRef.current > SILENCE_LIMIT_MS) {
          // Closing a dead socket can take a long time to fire onclose.
          ws.onclose = null;
          ws.close();
          handleDrop();
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (e) => {
      lastHeardRef.current = Date.now();
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === "joined") {
          joinedRef.current = true;
          attemptsRef.current = 0;
          setStatus("connected");
          if ((msg.session.round ?? 1) !== roundRef.current && msg.dishes?.length) {
            // A new round started while we were away; the server dropped
            // our swipes from the old one.
            startRound(msg.session, msg.dishes);
          } else {
            setSession(msg.session);
            syncProgress(msg.session);
            if (msg.dishes?.length) setDishes(msg.dishes);
          }
          if (msg.session.status === "matched") {
            router.replace({
              pathname: "/match",
              params: {
                dish: JSON.stringify(msg.session.matchedDish),
                code,
                meal: msg.session.meal,
                sample: msg.session.sample,
              },
            });
          }
        } else if (msg.type === "swipe_update") {
          setMemberSwipes((prev) => ({
            ...prev,
            [msg.memberId]: "swiped" in msg
              ? msg.swiped
              : Math.max(0, (prev[msg.memberId] ?? 0) + (msg.vote === "undo" ? -1 : 1)),
          }));
        } else if (msg.type === "member_joined" || msg.type === "member_left") {
          setSession(msg.session);
          syncProgress(msg.session);
        } else if (msg.type === "round_loading") {
          setRoundLoading(true);
        } else if (msg.type === "new_round") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          startRound(msg.session, msg.dishes);
        } else if (msg.type === "match") {
          // Also what a rejoin gets if the room matched while we were away.
          closingRef.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({
            pathname: "/match",
            params: { dish: JSON.stringify(msg.dish), code, meal: msg.session.meal, sample: msg.session.sample },
          });
        } else if (msg.type === "error") {
          closingRef.current = true;
          // After a drop this means everyone else left too and the room
          // closed; the server keeps a member who's away for 15 minutes.
          const notFound = msg.message === "Session not found";
          Alert.alert(
            notFound ? "Room closed" : "Error",
            notFound
              ? joinedRef.current
                ? "This room closed while you were disconnected. Create a new room to keep going."
                : "This room has ended."
              : msg.message,
            [{ text: "OK", onPress: () => router.replace("/home") }]
          );
        }
      } catch {}
    };

    // onclose follows onerror and handles both.
    ws.onclose = handleDrop;
  }, [code, userId, syncProgress, startRound]);

  useEffect(() => {
    connectWsRef.current = connectWs;
  }, [connectWs]);

  const reconnectNow = useCallback(() => {
    if (closingRef.current) return;
    const state = wsRef.current?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
    if (retryRef.current) clearTimeout(retryRef.current);
    attemptsRef.current = 0;
    setStatus("reconnecting");
    connectWs();
  }, [connectWs]);

  useEffect(() => {
    resetSwipes();
  }, [code]);

  useEffect(() => {
    closingRef.current = false;
    connectWs();
    return () => {
      closingRef.current = true;
      if (pingRef.current) clearInterval(pingRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // A long stay in the background can kill the socket without the retries
  // getting a chance to run, so check again when the app comes back.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        // It may still look open after dying in the background: probe it
        // with a fresh silence window rather than trusting or closing it.
        lastHeardRef.current = Date.now();
        ws.send(JSON.stringify({ type: "ping" }));
      } else {
        reconnectNow();
      }
    });
    return () => sub.remove();
  }, [reconnectNow]);

  const handleSwipe = useCallback((vote: "like" | "pass", dish: Dish) => {
    if (!cards[currentIndex]?.includes(dish)) return;

    if (vote === "like") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Offline swipes still count: the rejoin replays every recorded swipe.
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "swipe", dishId: dish.id, vote, round: roundRef.current })
      );
    } else {
      reconnectNow();
    }

    recordSwipe(dish, vote);
    setSwipeHistory((h) => [...h, { dishId: dish.id, vote }]);
    setDishIndex(0);
    setSwipedCount((c) => c + 1);
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, cards, reconnectNow]);

  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0 || currentIndex <= 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "undo", dishId: lastSwipe.dishId, round: roundRef.current })
      );
    } else {
      reconnectNow();
    }

    undoSwipe(lastSwipe.dishId);
    // Back on the card, showing the dish that was voted on.
    const card = cards[currentIndex - 1] ?? [];
    setDishIndex(Math.max(0, card.findIndex((d) => d.id === lastSwipe.dishId)));
    setSwipeHistory((h) => h.slice(0, -1));
    setSwipedCount((c) => Math.max(0, c - 1));
    setCurrentIndex((i) => i - 1);
  }, [swipeHistory, currentIndex, cards, reconnectNow]);

  // The server ignores an ask it can't act on (someone rejoined and hasn't
  // swiped yet), so don't leave the button spinning forever. Dealing new
  // places can take ~15 s with menu grounding on.
  useEffect(() => {
    if (!roundLoading) return;
    const t = setTimeout(() => setRoundLoading(false), 40000);
    return () => clearTimeout(t);
  }, [roundLoading]);

  const handleNewRound = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      reconnectNow();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRoundLoading(true);
    wsRef.current.send(JSON.stringify({ type: "new_round" }));
  }, [reconnectNow]);

  const topCard = cards[currentIndex];
  const handleButtonSwipe = (vote: "like" | "pass") => {
    const dish = topCard?.[dishIndex] ?? topCard?.[0];
    if (dish) handleSwipe(vote, dish);
  };

  const done = currentIndex >= cards.length;
  const progress = cards.length > 0 ? Math.min(currentIndex / cards.length, 1) : 0;
  const mealWord = session?.meal ?? "dinner";
  const isCookIn = dishes[0]?.mode === "cook-in";

  const members = session?.members ?? [];
  const round = session?.round ?? 1;
  // Everyone in the room has swiped every card and nothing matched: without
  // another round they'd wait here forever.
  const finishedCount = members.filter((m) =>
    m.id === userId ? done : (memberSwipes[m.id] ?? 0) >= cards.length
  ).length;
  const everyoneDone = done && cards.length > 0 && finishedCount === members.length;
  // Real places can be topped up from farther out; recipes and sample
  // restaurants can only be reshuffled.
  const freshPlaces = !isCookIn && !session?.sample;
  const reviewed = swipeHistory.flatMap(({ dishId, vote }) => {
    const d = dishes.find((x) => x.id === dishId);
    return d ? [{ dish: d, vote }] : [];
  });

  return (
    <LinearGradient colors={["#0F0F0F", "#1A0A00", "#0F0F0F"]} style={styles.container}>
      <View
        style={[
          styles.inner,
          {
            marginLeft: insets.left,
            marginRight: insets.right,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{MEAL_QUESTION[mealWord]}</Text>
            <Text style={styles.headerSub}>Swipe right on dinner, left to pass</Text>
          </View>
          <Pressable
            onPress={() => setPanelOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Session details"
            style={({ pressed }) => [styles.memberBubbles, { opacity: pressed ? 0.7 : 1 }]}
          >
            {members.slice(0, 4).map((m) => (
              <View key={m.id} style={styles.memberBubble}>
                <Text style={styles.memberBubbleLetter}>{m.name[0]?.toUpperCase()}</Text>
              </View>
            ))}
            {members.length > 4 && (
              <View style={[styles.memberBubble, styles.memberBubbleMore]}>
                <Text style={styles.memberBubbleLetter}>+{members.length - 4}</Text>
              </View>
            )}
            <View style={styles.infoDot}>
              <Ionicons name="chevron-down" size={12} color={Colors.text} />
            </View>
          </Pressable>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {round > 1 && `Round ${round}${session?.repeat ? " · reshuffled" : ""} · `}
          {currentIndex}/{cards.length} {isCookIn ? "recipes" : byDish ? "dishes" : "places"}
        </Text>

        <View style={[styles.cardStack, { maxHeight: height * 0.58 }]}>
          {done ? (
            <Animated.View entering={FadeIn} style={styles.doneCard}>
              <ScrollView contentContainerStyle={styles.doneScroll} showsVerticalScrollIndicator={false}>
                {everyoneDone ? (
                  <>
                    <Ionicons name="shuffle" size={56} color={Colors.accent} />
                    <Text style={styles.doneTitle}>No match yet</Text>
                    <Text style={styles.doneText}>
                      {"Everyone's swiped and no "}
                      {isCookIn ? "recipe" : "place"} got enough votes.{"\n"}
                      {freshPlaces
                        ? "Try a fresh batch from a bit farther out."
                        : `Shuffle the ${isCookIn ? "recipes" : "places"} and give them another look.`}
                    </Text>
                    <Pressable
                      onPress={handleNewRound}
                      disabled={roundLoading}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.roundBtn,
                        { opacity: pressed || roundLoading ? 0.8 : 1 },
                      ]}
                    >
                      <LinearGradient
                        colors={[Colors.accent, Colors.accentDeep]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.roundBtnGradient}
                      >
                        {roundLoading ? (
                          <>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.roundBtnText}>
                              {freshPlaces ? "Finding places..." : "Shuffling..."}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons
                              name={freshPlaces ? "search" : "shuffle"}
                              size={20}
                              color="#fff"
                            />
                            <Text style={styles.roundBtnText}>
                              {freshPlaces ? "Find New Places" : "Shuffle and Go Again"}
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={56} color={Colors.accent} />
                    <Text style={styles.doneTitle}>All done!</Text>
                    <Text style={styles.doneText}>
                      Waiting for the others to finish swiping...{"\n"}When enough of you swipe right, {mealWord} is decided.
                    </Text>
                    {members.length > 1 && (
                      <Text style={styles.doneCount}>
                        {finishedCount} of {members.length} done
                      </Text>
                    )}
                  </>
                )}
                <View style={styles.doneReview}>
                  <SwipeReview swipes={reviewed} />
                </View>
                <Pressable
                  onPress={() => router.replace("/home")}
                  style={styles.doneBtn}
                >
                  <Text style={styles.doneBtnText}>Back to Home</Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          ) : (
            <>
              {cards[currentIndex + 1] && (
                <DishCard
                  key={`bg-${currentIndex + 1}`}
                  dishes={cards[currentIndex + 1]}
                  onSwipe={() => {}}
                  isTop={false}
                  scale={0.95}
                  offset={10}
                />
              )}
              {topCard && (
                <DishCard
                  key={`top-${currentIndex}`}
                  dishes={topCard}
                  index={dishIndex}
                  onIndexChange={handleDishFlip}
                  showHint={showDishHint}
                  onSwipe={handleSwipe}
                  isTop={true}
                  scale={1}
                  offset={0}
                />
              )}
            </>
          )}
          {/* Keep the deck in place while reconnecting. The rejoin sends
              any swipes made while offline. */}
          {(status === "reconnecting" || status === "offline") && (
            <View style={styles.connectionBanner}>
              {status === "reconnecting" ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Ionicons name="cloud-offline-outline" size={18} color={Colors.accent} />
              )}
              <Text style={styles.connectionText}>
                {status === "reconnecting" ? "Connection lost. Reconnecting..." : "Can't reach the room."}
              </Text>
              {status === "offline" && (
                <Pressable onPress={reconnectNow} hitSlop={8}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {!done && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleButtonSwipe("pass")}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnPass,
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
            >
              <Ionicons name="close" size={32} color={Colors.red} />
            </Pressable>

            <Pressable
              onPress={handleUndo}
              disabled={swipeHistory.length === 0}
              style={({ pressed }) => [
                styles.undoBtn,
                swipeHistory.length === 0 && styles.undoBtnDisabled,
                { transform: [{ scale: pressed && swipeHistory.length > 0 ? 0.9 : 1 }] },
              ]}
            >
              <Ionicons
                name="arrow-undo"
                size={22}
                color={swipeHistory.length > 0 ? Colors.accentGold : Colors.textMuted}
              />
            </Pressable>

            <Pressable
              onPress={() => handleButtonSwipe("like")}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnLike,
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
            >
              <Ionicons name="heart" size={32} color={Colors.green} />
            </Pressable>
          </View>
        )}
      </View>
      <SessionPanel
        visible={panelOpen}
        onClose={() => setPanelOpen(false)}
        code={code ?? ""}
        members={members}
        hostId={session?.hostId}
        myId={userId}
        progress={{ ...memberSwipes, [userId]: currentIndex }}
        total={cards.length}
        swipes={reviewed}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  headerText: { flexShrink: 1 },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  memberBubbles: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 4,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  memberBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,107,53,0.2)",
    borderWidth: 2,
    borderColor: "#0F0F0F",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  memberBubbleMore: {
    backgroundColor: Colors.surface,
  },
  memberBubbleLetter: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
    textAlign: "right",
    paddingRight: 4,
    marginTop: -8,
  },
  cardStack: {
    flex: 1,
    position: "relative",
    alignItems: "center",
  },
  connectionBanner: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    elevation: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  connectionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: Colors.text,
  },
  retryText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.accent,
  },
  actionRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtnPass: {
    backgroundColor: "rgba(244,67,54,0.12)",
    borderWidth: 2,
    borderColor: "rgba(244,67,54,0.3)",
  },
  actionBtnLike: {
    backgroundColor: "rgba(76,175,80,0.12)",
    borderWidth: 2,
    borderColor: "rgba(76,175,80,0.3)",
  },
  undoBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,179,71,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,179,71,0.25)",
  },
  undoBtnDisabled: {
    opacity: 0.35,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  doneCard: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  doneScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  doneReview: {
    alignSelf: "stretch",
  },
  doneTitle: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
  },
  doneText: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  doneCount: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: Colors.textMuted,
  },
  roundBtn: {
    alignSelf: "stretch",
    borderRadius: 16,
    overflow: "hidden",
  },
  roundBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  roundBtnText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  doneBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.textSecondary,
  },
});
