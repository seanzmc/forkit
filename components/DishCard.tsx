import React, { useEffect } from "react";
import { View, Text, StyleSheet, PanResponder } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat,
  withSequence, runOnJS, interpolate, Extrapolate,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";
import { PlacesAttribution } from "@/components/PlacesAttribution";
import { SuggestedDishLabel } from "@/components/SuggestedDishLabel";
import { GroundedSource } from "@/components/GroundedSource";
import { resolveImageUrl } from "@/lib/query-client";

const TAP_SLOP = 8;

// A restaurant's dishes, one at a time: tap the right half for the next
// dish, the left half for the previous one. A swipe votes on the dish
// showing, so a match still lands on a dish someone actually liked.
export function DishCard({
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
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const swipeWidth = Math.max(1, frame.width - insets.left - insets.right);
  const swipeThreshold = swipeWidth * 0.3;
  const cardCenterX = frame.x + insets.left + swipeWidth / 2;

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
      if (d.image && !d.photoAuthors && !d.placePhotoCredit && d.menuSource !== "spoonacular") {
        Image.prefetch(resolveImageUrl(d.image), "disk").catch(() => {});
      }
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
      rotation.value = (gs.dx / swipeWidth) * 25;
      likeOpacity.value = Math.max(0, gs.dx / swipeThreshold);
      passOpacity.value = Math.max(0, -gs.dx / swipeThreshold);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > swipeThreshold) {
        translateX.value = withTiming(swipeWidth * 1.5, { duration: 300 });
        translateY.value = withTiming(gs.dy, { duration: 300 });
        runOnJS(onSwipe)("like", dish);
      } else if (gs.dx < -swipeThreshold) {
        translateX.value = withTiming(-swipeWidth * 1.5, { duration: 300 });
        translateY.value = withTiming(gs.dy, { duration: 300 });
        runOnJS(onSwipe)("pass", dish);
      } else if (
        onIndexChange &&
        count > 1 &&
        Math.abs(gs.dx) < TAP_SLOP &&
        Math.abs(gs.dy) < TAP_SLOP
      ) {
        // Wraps around, so tapping on always comes back to the first dish.
        const step = gs.x0 < cardCenterX ? -1 : 1;
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
      {dish.image ? (
        <Image
          source={{ uri: resolveImageUrl(dish.image) }}
          style={styles.cardImage}
          contentFit="cover"
          cachePolicy={dish.photoAuthors || dish.placePhotoCredit ? "none" : "disk"}
        />
      ) : (
        <View style={[styles.cardImage, styles.noPhoto]}>
          <Ionicons name="restaurant-outline" size={58} color={Colors.textMuted} />
        </View>
      )}
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

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
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
  noPhoto: { alignItems: "center", paddingTop: 80 },
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
});
