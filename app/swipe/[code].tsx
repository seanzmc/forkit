import React, { useState, useEffect, useRef, useCallback } from "react";
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
  runOnJS,
  interpolate,
  Extrapolate,
  FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import type { Dish } from "@/lib/food-data";
import { PlacesAttribution } from "@/components/PlacesAttribution";
import { SuggestedDishLabel } from "@/components/SuggestedDishLabel";
import { GroundedSource } from "@/components/GroundedSource";
import { SwipeReview } from "@/components/SwipeReview";
import { SessionPanel } from "@/components/SessionPanel";
import { recordSwipe, resetSwipes, undoSwipe } from "@/lib/swipe-review";
import { getPushToken } from "@/lib/push";
import { getWsUrl, type SessionState, type WsMessage } from "@/lib/websocket";
import * as Crypto from "expo-crypto";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.58;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

function DishCard({
  dish,
  onSwipe,
  isTop,
  scale,
  offset,
}: {
  dish: Dish;
  onSwipe: (vote: "like" | "pass") => void;
  isTop: boolean;
  scale: number;
  offset: number;
}) {
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
        runOnJS(onSwipe)("like");
      } else if (gs.dx < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        translateY.value = withTiming(gs.dy, { duration: 300 });
        runOnJS(onSwipe)("pass");
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
        source={{ uri: dish.image }}
        style={styles.cardImage}
        resizeMode="cover"
      />
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
        ) : dish.restaurantOnly ? (
          <Text style={styles.dishName} numberOfLines={2}>{dish.restaurant}</Text>
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
  const userId = paramUserId ?? Crypto.randomUUID();

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectWs = useCallback(async () => {
    const name = await AsyncStorage.getItem("userName");
    if (!name) return;

    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", code: code?.toUpperCase(), userId, name }));
      // Registered separately so a slow permission prompt or APNs lookup
      // never delays joining and a late token still reaches the server.
      getPushToken().then((pushToken) => {
        if (pushToken && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "push_token", pushToken }));
        }
      });
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 20000);
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === "joined") {
          setSession(msg.session);
          if (msg.dishes?.length) setDishes(msg.dishes);
          if (msg.session.status === "matched") {
            router.replace({ pathname: "/match", params: { dish: JSON.stringify(msg.session.matchedDish) } });
          }
        } else if (msg.type === "swipe_update") {
          setMemberSwipes((prev) => ({
            ...prev,
            [msg.memberId]: Math.max(0, (prev[msg.memberId] ?? 0) + (msg.vote === "undo" ? -1 : 1)),
          }));
        } else if (msg.type === "member_joined" || msg.type === "member_left") {
          setSession(msg.session);
        } else if (msg.type === "match") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({ pathname: "/match", params: { dish: JSON.stringify(msg.dish) } });
        }
      } catch {}
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, [code, userId]);

  useEffect(() => {
    resetSwipes();
  }, [code]);

  useEffect(() => {
    connectWs();
    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  const handleSwipe = useCallback((vote: "like" | "pass") => {
    const dish = dishes[currentIndex];
    if (!dish) return;

    if (vote === "like") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "swipe", dishId: dish.id, vote }));
    }

    recordSwipe(dish, vote);
    setSwipeHistory((h) => [...h, { dishId: dish.id, vote }]);
    setSwipedCount((c) => c + 1);
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, dishes]);

  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0 || currentIndex <= 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "undo", dishId: lastSwipe.dishId }));
    }

    undoSwipe(lastSwipe.dishId);
    setSwipeHistory((h) => h.slice(0, -1));
    setSwipedCount((c) => Math.max(0, c - 1));
    setCurrentIndex((i) => i - 1);
  }, [swipeHistory, currentIndex]);

  const handleButtonSwipe = (vote: "like" | "pass") => {
    handleSwipe(vote);
  };

  const done = currentIndex >= dishes.length;
  const progress = dishes.length > 0 ? Math.min(currentIndex / dishes.length, 1) : 0;

  const members = session?.members ?? [];
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
            <Text style={styles.headerTitle}>{"What's for dinner?"}</Text>
            <Text style={styles.headerSub}>Swipe right if you want it</Text>
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
          {currentIndex}/{dishes.length} dishes
        </Text>

        <View style={styles.cardStack}>
          {done ? (
            <Animated.View entering={FadeIn} style={styles.doneCard}>
              <ScrollView contentContainerStyle={styles.doneScroll} showsVerticalScrollIndicator={false}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.accent} />
                <Text style={styles.doneTitle}>All done!</Text>
                <Text style={styles.doneText}>
                  Waiting for others to finish swiping...{"\n"}A match will be revealed when the group decides.
                </Text>
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
              {dishes[currentIndex + 1] && (
                <DishCard
                  key={`bg-${currentIndex + 1}`}
                  dish={dishes[currentIndex + 1]}
                  onSwipe={() => {}}
                  isTop={false}
                  scale={0.95}
                  offset={10}
                />
              )}
              {dishes[currentIndex] && (
                <DishCard
                  key={`top-${currentIndex}`}
                  dish={dishes[currentIndex]}
                  onSwipe={handleSwipe}
                  isTop={true}
                  scale={1}
                  offset={0}
                />
              )}
            </>
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
        total={dishes.length}
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
