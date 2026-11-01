import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

const SEEN_KEY = "seenHowItWorks";

// Shows the walkthrough the first time a device reaches a screen that calls
// this (home, or the lobby when an invite link skipped home), and lets the
// screen open it again. Storage errors leave it closed rather than nagging.
export function useHowItWorks() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((seen) => {
        if (!seen) setVisible(true);
      })
      .catch(() => {});
  }, []);
  const open = useCallback(() => setVisible(true), []);
  // Marked seen only once closed, so a lobby that moves on to the game
  // mid-walkthrough shows it again next time.
  const close = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, "1").catch(() => {});
  }, []);
  return { visible, open, close };
}

type Step = {
  title: string;
  body: string;
  art: React.ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Start a room",
    body: "Pick Dine Out for restaurants near you or Cook In for recipes. Dining out, choose By place for one card per restaurant or By dish for a card per dish. Tap Create Room and share the 6-character code; your friends tap Join Room to get in.",
    art: <RoomArt />,
  },
  {
    title: "Swipe on dishes",
    body: "Swipe right on what you'd eat, left on what you wouldn't. On a By place card, tap either side of the photo to flip through more dishes from the same place. Nobody sees how you voted.",
    art: <SwipeArt />,
  },
  {
    title: "It's a match",
    body: "The moment most of the group likes the same restaurant, or the same recipe when cooking in, everyone gets the match, with directions and a call button or the full recipe.",
    art: <MatchArt />,
  },
  {
    title: "No match? Go again",
    body: "If everyone swipes through every card and nothing matches, anyone can start another round, with new places from further out when there are any.",
    art: <RoundArt />,
  },
];

export function HowItWorks({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Shrinks on short phones (an SE gets ~240) so the text still fits above
  // the buttons; anything left over scrolls.
  const artHeight = Math.min(300, Math.max(236, Math.round(height * 0.36)));
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  // Start from the top each time it opens.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setStep(0);
  }

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (last) onClose();
    else setStep(step + 1);
  };

  const { title, body, art } = STEPS[step];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <LinearGradient colors={["#0F0F0F", "#1A0A00", "#0F0F0F"]} style={styles.container}>
        <View
          style={[
            styles.inner,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 24 : 12),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
            },
          ]}
        >
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>How ForkIt works</Text>
            {!last && (
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
                <Text style={styles.skip}>Skip</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <Animated.View key={step} entering={FadeIn.duration(250)} style={styles.stepBody}>
              <View style={[styles.artBox, { height: artHeight }]}>{art}</View>
              <Text style={styles.stepCount}>
                STEP {step + 1} OF {STEPS.length}
              </Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
            </Animated.View>
          </ScrollView>

          <View style={styles.dots}>
            {STEPS.map((s, i) => (
              <Pressable
                key={s.title}
                onPress={() => setStep(i)}
                hitSlop={6}
                accessibilityLabel={`Step ${i + 1}: ${s.title}`}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.buttons}>
            {step > 0 && (
              <Pressable
                onPress={() => setStep(step - 1)}
                style={styles.backBtn}
                accessibilityLabel="Back"
              >
                <Ionicons name="arrow-back" size={22} color={Colors.text} />
              </Pressable>
            )}
            <Pressable
              onPress={next}
              style={({ pressed }) => [
                styles.nextBtn,
                { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextGradient}
              >
                <Text style={styles.nextText}>{last ? "Got It" : "Next"}</Text>
                <Ionicons name={last ? "checkmark" : "arrow-forward"} size={20} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
}

function RoomArt() {
  return (
    <View style={styles.artCenter}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>SESSION CODE</Text>
        <Text style={styles.code}>K7Q2XM</Text>
        <View style={styles.shareRow}>
          <Ionicons name="share-outline" size={14} color={Colors.accent} />
          <Text style={styles.shareText}>Share with your group</Text>
        </View>
      </View>
      <View style={styles.avatars}>
        {["A", "J", "S"].map((letter, i) => (
          <View key={letter} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
            <Text style={styles.avatarLetter}>{letter}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// A card that leans right (like), back, then left (pass), on a loop.
function SwipeArt() {
  const x = useSharedValue(0);
  useEffect(() => {
    const move = (to: number) => withTiming(to, { duration: 450 });
    x.set(
      withDelay(
        400,
        withRepeat(
          withSequence(
            move(70),
            withDelay(500, move(0)),
            withDelay(300, move(-70)),
            withDelay(500, move(0)),
            withDelay(500, move(0))
          ),
          -1
        )
      )
    );
    return () => cancelAnimation(x);
  }, [x]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${x.value / 6}deg` }],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, x.value / 70) }));
  const passStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, -x.value / 70) }));

  return (
    <View style={styles.artCenter}>
      <Animated.View style={[styles.demoCard, cardStyle]}>
        <LinearGradient
          colors={["#3A1A08", "#1A1A1A"]}
          style={styles.demoPhoto}
        >
          <MaterialCommunityIcons name="noodles" size={56} color={Colors.accentGold} />
          <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.5)" style={styles.flipLeft} />
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" style={styles.flipRight} />
        </LinearGradient>
        <View style={styles.demoInfo}>
          <Text style={styles.demoDish}>Spicy Ramen</Text>
          <Text style={styles.demoPlace}>Noodle Bar · 0.4 mi</Text>
        </View>
        <Animated.View style={[styles.stamp, styles.stampLike, likeStyle]}>
          <Text style={[styles.stampText, { color: Colors.green }]}>YUMMY</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampPass, passStyle]}>
          <Text style={[styles.stampText, { color: Colors.red }]}>NOPE</Text>
        </Animated.View>
      </Animated.View>
      <View style={styles.voteRow}>
        <View style={[styles.voteBtn, { borderColor: "rgba(244,67,54,0.4)" }]}>
          <Ionicons name="close" size={24} color={Colors.red} />
        </View>
        <View style={[styles.voteBtn, { borderColor: "rgba(76,175,80,0.4)" }]}>
          <Ionicons name="heart" size={24} color={Colors.green} />
        </View>
      </View>
    </View>
  );
}

function MatchArt() {
  return (
    <View style={styles.artCenter}>
      <View style={styles.matchBadge}>
        <Ionicons name="heart" size={44} color="#fff" />
      </View>
      <Text style={styles.matchText}>{"It's a Match!"}</Text>
      <View style={styles.tally}>
        {[true, true, false].map((liked, i) => (
          <Ionicons
            key={i}
            name={liked ? "heart" : "close"}
            size={18}
            color={liked ? Colors.green : Colors.textMuted}
          />
        ))}
        <Text style={styles.tallyText}>2 of 3 is a match</Text>
      </View>
    </View>
  );
}

function RoundArt() {
  return (
    <View style={styles.artCenter}>
      <View style={styles.roundIcon}>
        <Ionicons name="refresh" size={48} color={Colors.accent} />
      </View>
      <View style={styles.roundChip}>
        <Ionicons name="search" size={14} color={Colors.text} />
        <Text style={styles.roundChipText}>Find New Places</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  topBarTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  skip: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: Colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  stepBody: {
    gap: 10,
  },
  artBox: {
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  artCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  stepCount: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: Colors.accent,
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  backBtn: {
    width: 56,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  nextGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  nextText: {
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  codeCard: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.25)",
  },
  codeLabel: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: Colors.textSecondary,
    letterSpacing: 3,
  },
  code: {
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
    letterSpacing: 6,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: Colors.accent,
  },
  avatars: {
    flexDirection: "row",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3A1F12",
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  avatarLetter: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
  },
  demoCard: {
    width: 170,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  demoPhoto: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  flipLeft: {
    position: "absolute",
    left: 6,
  },
  flipRight: {
    position: "absolute",
    right: 6,
  },
  demoInfo: {
    padding: 10,
  },
  demoDish: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  demoPlace: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  stamp: {
    position: "absolute",
    top: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  stampLike: {
    left: 12,
    borderColor: Colors.green,
    transform: [{ rotate: "-12deg" }],
  },
  stampPass: {
    right: 12,
    borderColor: Colors.red,
    transform: [{ rotate: "12deg" }],
  },
  stampText: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
  },
  voteRow: {
    flexDirection: "row",
    gap: 28,
  },
  voteBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  matchBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  matchText: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
  },
  tally: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  tallyText: {
    marginLeft: 4,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: Colors.textSecondary,
  },
  roundIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "rgba(255,107,53,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  roundChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roundChipText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
});
