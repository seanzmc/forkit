import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  withRepeat,
  FadeIn,
  FadeInDown,
  ZoomIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import type { Dish } from "@/lib/food-data";

function ConfettiDot({ delay, x, color }: { delay: number; x: number; color: string }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(300, { duration: 1200 }));
    opacity.value = withDelay(delay + 800, withTiming(0, { duration: 400 }));
    rotate.value = withDelay(delay, withRepeat(withTiming(360, { duration: 600 }), -1));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: x }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.confettiDot, { backgroundColor: color }, style]} />
  );
}

const CONFETTI_COLORS = [Colors.accent, Colors.accentGold, Colors.green, "#FF6B9D", "#9B59B6", "#3498DB"];

export default function MatchScreen() {
  const { dish: dishParam } = useLocalSearchParams<{ dish: string }>();
  const insets = useSafeAreaInsets();

  const dish: Dish | null = (() => {
    try { return JSON.parse(dishParam ?? "null"); } catch { return null; }
  })();

  const heroScale = useSharedValue(0.5);
  const heroOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    heroScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 120 }));
    heroOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    pulseScale.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1
    ));
  }, []);

  const confettiItems = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    delay: i * 80,
    x: (i - 9) * 18,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  return (
    <LinearGradient colors={["#0F0F0F", "#1A0800", "#0F0F0F"]} style={styles.container}>
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiItems.map((c) => (
          <ConfettiDot key={c.id} delay={c.delay} x={c.x} color={c.color} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 32),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.matchHeader}>
          <View style={styles.matchBadge}>
            <Ionicons name="flame" size={16} color={Colors.accent} />
            <Text style={styles.matchBadgeText}>IT'S A MATCH</Text>
            <Ionicons name="flame" size={16} color={Colors.accent} />
          </View>
          <Text style={styles.matchTitle}>Dinner is decided!</Text>
          <Text style={styles.matchSubtitle}>Your group agrees on this one</Text>
        </Animated.View>

        {dish && (
          <Animated.View style={[styles.dishHero, heroStyle]}>
            <Animated.View style={pulseStyle}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: dish.image }}
                  style={styles.dishImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.6)"]}
                  style={styles.imageGradient}
                />
                <View style={styles.heartBadge}>
                  <Ionicons name="heart" size={20} color="#fff" />
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {dish && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.dishInfo}>
            <View style={styles.cuisineTag}>
              <Text style={styles.cuisineTagText}>{dish.cuisine}</Text>
            </View>
            <Text style={styles.dishName}>{dish.name}</Text>
            <View style={styles.restaurantRow}>
              <View style={styles.restaurantIcon}>
                <Ionicons name="restaurant" size={16} color={Colors.accent} />
              </View>
              <Text style={styles.restaurantName}>{dish.restaurant}</Text>
            </View>
            {!!dish.address && (
              <View style={styles.addressRow}>
                <Ionicons name="navigate-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.addressText}>{dish.address}</Text>
              </View>
            )}
            <Text style={styles.dishDesc}>{dish.description}</Text>
            <View style={styles.metaRow}>
              <View style={styles.priceCard}>
                <Ionicons name="pricetag" size={16} color={Colors.accentGold} />
                <Text style={styles.priceText}>{dish.price}</Text>
              </View>
              {!!dish.rating && dish.rating > 0 && (
                <View style={styles.priceCard}>
                  <Ionicons name="star" size={16} color={Colors.accentGold} />
                  <Text style={styles.priceText}>{dish.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {!dish && (
          <Animated.View entering={FadeIn.delay(300)} style={styles.noDish}>
            <Ionicons name="restaurant" size={56} color={Colors.accent} />
            <Text style={styles.noDishText}>Your group found a match!</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(600)} style={styles.actions}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/home");
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="home" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Back to Home</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/home");
            }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.secondaryBtnText}>New Session</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: "50%",
    zIndex: 10,
    flexDirection: "row",
  },
  confettiDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    position: "absolute",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  matchHeader: {
    alignItems: "center",
    gap: 8,
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,53,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.3)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  matchBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
    letterSpacing: 2,
  },
  matchTitle: {
    fontSize: 34,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  matchSubtitle: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  dishHero: {
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    height: 280,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  dishImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  heartBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  dishInfo: {
    gap: 10,
  },
  cuisineTag: {
    alignSelf: "flex-start",
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cuisineTagText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dishName: {
    fontSize: 30,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
    lineHeight: 36,
  },
  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  restaurantIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.textSecondary,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
    flex: 1,
  },
  dishDesc: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
  },
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceText: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: Colors.accentGold,
  },
  noDish: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 40,
  },
  noDishText: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: Colors.textSecondary,
  },
});
