import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  PanResponder,
  Dimensions,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  AppState,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolate,
  FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import type { Dish, Meal } from "@/lib/food-data";
import { PlacesAttribution } from "@/components/PlacesAttribution";
import { SuggestedDishLabel } from "@/components/SuggestedDishLabel";
import { GroundedSource } from "@/components/GroundedSource";
import { SwipeReview } from "@/components/SwipeReview";
import { SessionPanel } from "@/components/SessionPanel";
import { getSwipes, recordSwipe, resetSwipes, undoSwipe } from "@/lib/swipe-review";
import { getPushToken } from "@/lib/push";
import { getWsUrl, type SessionState, type WsMessage } from "@/lib/websocket";
import { resolveImageUrl } from "@/lib/query-client";
import * as Crypto from "expo-crypto";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.58;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
// A touch that moves less than this is a tap, not a drag.
const TAP_SLOP = 8;
// Set once someone has flipped through a card's dishes, so the hint on how
// to do that stops showing.
const DISH_HINT_KEY = "seenDishFlipHint";
// Same reconnect policy as the lobby: backoff before each attempt, then a
// Retry button. The server answers every 20 s ping, so 45 s of silence means
// the socket is dead even if it still reports OPEN.
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 8000];
const SILENCE_LIMIT_MS = 45000;
const PING_INTERVAL_MS = 20000;

// One card per restaurant (per recipe in cook-in): its dishes are what the
// deck is about, and it's easier to judge a place with all of them in hand.
function groupCards(dishes: Dish[]): Dish[][] {
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

// A restaurant's dishes, one at a time: tap the right half for the next
// dish, the left half for the previous one. A swipe votes on the dish
// showing, so a match still lands on a dish someone actually liked.
function DishCard({
  dishes,
  index = 0,
  onIndexChange,
  onSwipe,
  isTop,
  scale,
  offset,
  showHint = false,
}: {
  dishes: Dish[];
  // Which dish shows. Kept by the screen so its like and pass buttons vote
  // on the same dish.
  index?: number;
  onIndexChange?: (index: number) => void;
  onSwipe: (vote: "like" | "pass", dish: Dish) => void;
  isTop: boolean;
  scale: number;
  offset: number;
  // Show the "tap the sides" hint (until the first flip).
  showHint?: boolean;
}) {
  const dish = dishes[index] ?? dishes[0];
  const count = dishes.length;

  // A slow pulse so the hint reads as something to act on.
  const hintPulse = useSharedValue(1);
  useEffect(() => {
    if (!showHint) return;
    hintPulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1
    );
  }, [showHint, hintPulse]);
  const hintStyle = useAnimatedStyle(() => ({ transform: [{ scale: hintPulse.value }] }));

  // Load the other dishes' photos now so flipping to them is instant.
  useEffect(() => {
    if (!isTop) return;
    dishes.slice(1).forEach((d) => {
      Image.prefetch(resolveImageUrl(d.image)).catch(() => {});
    });
  }, [isTop, dishes]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const likeOpacity = useSharedValue(0);
  const passOpacity = useSharedValue(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isTop,
    onMoveShouldSetPanResponder: () => isTop,
    onPanResponderMove: (_, gs) => {
      translateX.value = gs.dx;
      translateY.value = gs.dy * 0.4;
      rotation.value = (gs.dx / SCREEN_WIDTH) * 25;
      likeOpacity.value = Math.max(0, gs.dx / SWIPE_THRESHOLD);
      passOpacity.value = Math.max(0, -gs.dx / SWIPE_THRESHOLD);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        translateY.value = withTiming(gs.dy, { duration: 300 });
        runOnJS(onSwipe)("like", dish);
      } else if (gs.dx < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        translateY.value = withTiming(gs.dy, { duration: 300 });
        runOnJS(onSwipe)("pass", dish);
      } else if (
        onIndexChange &&
        count > 1 &&
        Math.abs(gs.dx) < TAP_SLOP &&
        Math.abs(gs.dy) < TAP_SLOP
      ) {
        // Wraps around, so tapping on always comes back to the first dish.
        const step = gs.x0 < SCREEN_WIDTH / 2 ? -1 : 1;
        onIndexChange((index + step + count) % count);
        Haptics.selectionAsync();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        rotation.value = withSpring(0, { damping: 15 });
        likeOpacity.value = withTiming(0);
        passOpacity.value = withTiming(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: isTop ? 1 : scale },
    ],
    top: isTop ? 0 : offset,
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(likeOpacity.value, [0, 1], [0, 1], Extrapolate.CLAMP),
  }));

  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(passOpacity.value, [0, 1], [0, 1], Extrapolate.CLAMP),
  }));

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <Image
        source={{ uri: resolveImageUrl(dish.image) }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      {count > 1 && (
        <View style={styles.dishPager} pointerEvents="none">
          <View style={styles.dishSegments}>
            {dishes.map((d, i) => (
              <View
                key={d.id}
                style={[styles.dishSegment, i === index && styles.dishSegmentActive]}
              />
            ))}
          </View>
          <View style={styles.dishCountChip}>
            <Ionicons name="restaurant-outline" size={12} color="#fff" />
            <Text style={styles.dishCountText}>
              {index + 1} of {count} dishes here
            </Text>
          </View>
        </View>
      )}
      {/* Tap targets are the card's halves (see the pan handler); these
          only show where to tap. */}
      {count > 1 && (
        <>
          <View style={[styles.dishArrow, styles.dishArrowLeft]} pointerEvents="none">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </View>
          <View style={[styles.dishArrow, styles.dishArrowRight]} pointerEvents="none">
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </View>
        </>
      )}
      {count > 1 && showHint && (
        <View style={styles.dishHintWrap} pointerEvents="none">
          <Animated.View style={[styles.dishHint, hintStyle]}>
            <Ionicons name="hand-left-outline" size={16} color="#fff" />
            <Text style={styles.dishHintText} numberOfLines={1}>
              Tap for more dishes
            </Text>
          </Animated.View>
        </View>
      )}
      {/* Dark enough under the text block that the Google Maps / photo
          attribution stays legible on bright photos (Places policy). */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.92)"]}
        locations={[0, 0.35, 1]}
        style={styles.cardGradient}
      />

      <Animated.View style={[styles.likeStamp, likeStyle]}>
        <Ionicons name="heart" size={28} color={Colors.green} />
        <Text style={[styles.stampText, { color: Colors.green }]}>YUMMY</Text>
      </Animated.View>

      <Animated.View style={[styles.passStamp, passStyle]}>
        <Ionicons name="close" size={28} color={Colors.red} />
        <Text style={[styles.stampText, { color: Colors.red }]}>NOPE</Text>
      </Animated.View>

      {/* Reading order: where (restaurant), what (dish), what it is, then
          the details. Cook-in recipes have no restaurant, so the dish leads. */}
      <View style={styles.cardContent}>
        {dish.mode === "cook-in" ? (
          <Text style={styles.dishName} numberOfLines={2}>{dish.name}</Text>
        ) : (
          <>
            <View style={styles.restaurantRow}>
              <Ionicons name="restaurant" size={15} color={Colors.accent} />
              <Text style={styles.restaurantName} numberOfLines={1}>{dish.restaurant}</Text>
            </View>
            <Text style={styles.dishName} numberOfLines={2}>{dish.name}</Text>
            <SuggestedDishLabel dish={dish} />
          </>
        )}
        {!!dish.description && (
          <Text style={styles.dishDesc} numberOfLines={2}>{dish.description}</Text>
        )}
        <GroundedSource dish={dish} />
        {dish.mode === "cook-in" ? (
          <View style={styles.recipeMeta}>
            {!!dish.cookTime && (
              <View style={styles.recipeMetaChip}>
                <Ionicons name="time-outline" size={12} color={Colors.accentGold} />
                <Text style={styles.recipeMetaText}>{dish.cookTime}</Text>
              </View>
            )}
            {!!dish.servings && (
              <View style={styles.recipeMetaChip}>
                <Ionicons name="people-outline" size={12} color={Colors.accentGold} />
                <Text style={styles.recipeMetaText}>{dish.servings} servings</Text>
              </View>
            )}
            {!!dish.difficulty && (
              <View style={styles.recipeMetaChip}>
                <Ionicons name="speedometer-outline" size={12} color={Colors.accentGold} />
                <Text style={styles.recipeMetaText}>{dish.difficulty}</Text>
              </View>
            )}
          </View>
        ) : (
          !!dish.address && dish.address !== dish.restaurant && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.addressLine} numberOfLines={1}>{dish.address}</Text>
            </View>
          )
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{dish.cuisine}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={[styles.metaText, styles.metaPrice]}>
            {dish.mode === "cook-in" ? `~${dish.price}/serving` : dish.price}
          </Text>
          {!!dish.rating && dish.rating > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="star" size={13} color={Colors.accentGold} />
              <Text style={styles.metaText}>
                {dish.rating.toFixed(1)}
                {!!dish.ratingCount && ` (${dish.ratingCount.toLocaleString()})`}
              </Text>
            </>
          )}
        </View>
        <PlacesAttribution dish={dish} />
      </View>
    </Animated.View>
  );
}

export default function SwipeScreen() {
  const { code, userId: paramUserId, dishes: dishesParam } = useLocalSearchParams<{
    code: string;
    userId: string;
    dishes: string;
  }>();
  const insets = useSafeAreaInsets();

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
  // Until they've flipped a card once; storage errors just keep it showing.
  const [showDishHint, setShowDishHint] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(DISH_HINT_KEY)
      .then((seen) => setShowDishHint(!seen))
      .catch(() => setShowDishHint(true));
  }, []);
  const handleDishFlip = useCallback((index: number) => {
    setDishIndex(index);
    setShowDishHint(false);
    AsyncStorage.setItem(DISH_HINT_KEY, "1").catch(() => {});
  }, []);
  const cards = useMemo(() => groupCards(dishes), [dishes]);
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
      // Closing the old socket removed this member and their swipes on the
      // server, so rejoin with the same userId and every swipe made so far,
      // including any made while offline. Empty on the first join.
      const swipes = Object.fromEntries(getSwipes().map((s) => [s.dish.id, s.vote]));
      ws.send(
        JSON.stringify({
          type: "join",
          code: code?.toUpperCase(),
          userId,
          name,
          swipes,
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
                meal: msg.session.meal,
                sample: msg.session.sample,
              },
            });
          }
        } else if (msg.type === "swipe_update") {
          setMemberSwipes((prev) => ({
            ...prev,
            [msg.memberId]: Math.max(0, (prev[msg.memberId] ?? 0) + (msg.vote === "undo" ? -1 : 1)),
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
            params: { dish: JSON.stringify(msg.dish), meal: msg.session.meal, sample: msg.session.sample },
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
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
      >
        <View style={styles.header}>
          <View>
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
          {currentIndex}/{cards.length} {isCookIn ? "recipes" : "places"}
        </Text>

        <View style={styles.cardStack}>
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
          {/* Over the cards rather than above them: the cards have a fixed
              height, so pushing them down would run them into the buttons.
              Swiping keeps working; the rejoin sends those swipes along. */}
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
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  dishPager: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    gap: 8,
    alignItems: "flex-start",
  },
  dishSegments: {
    flexDirection: "row",
    gap: 4,
    alignSelf: "stretch",
  },
  dishSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dishSegmentActive: {
    backgroundColor: "#fff",
  },
  dishCountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  dishCountText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#fff",
  },
  dishArrow: {
    position: "absolute",
    top: "32%",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dishArrowLeft: {
    left: 10,
  },
  dishArrowRight: {
    right: 10,
  },
  dishHintWrap: {
    position: "absolute",
    top: "32%",
    left: 52,
    right: 52,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dishHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.accent,
  },
  dishHintText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "75%",
  },
  likeStamp: {
    position: "absolute",
    top: 32,
    left: 24,
    borderWidth: 3,
    borderColor: Colors.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    transform: [{ rotate: "-15deg" }],
  },
  passStamp: {
    position: "absolute",
    top: 32,
    right: 24,
    borderWidth: 3,
    borderColor: Colors.red,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    transform: [{ rotate: "15deg" }],
  },
  stampText: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 2,
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 6,
  },
  dishName: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: "#fff",
    lineHeight: 34,
  },
  restaurantName: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  addressLine: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  metaPrice: {
    color: Colors.accentGold,
    fontFamily: "Poppins_600SemiBold",
  },
  metaDot: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  recipeMeta: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  recipeMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,179,71,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recipeMetaText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: Colors.accentGold,
  },
  dishDesc: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
  },
  actionRow: {
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
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
