import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "@/constants/colors";
import type { SwipeVote } from "@/lib/swipe-review";
import { useDishCardMotion } from "./useDishCardMotion";

const lessons = [
  "Try a swipe",
  "Take a swipe back",
  "Switch the menu",
  "Invite from your deck",
];

const ramen = require("@/assets/dishes/miso-ramen.jpg");
const salmon = require("@/assets/dishes/grilled-salmon.jpg");

type Icon = React.ComponentProps<typeof Ionicons>["name"];

function Action({ label, icon, onPress, primary, selected }: {
  label: string;
  icon?: Icon;
  onPress: () => void;
  primary?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress} style={({ pressed }) => [s.action, (primary || selected) && s.active, pressed && s.pressed]}>
      {icon && <Ionicons name={icon} size={19} color={primary || selected ? Colors.background : Colors.text} />}
      <Text style={[s.actionText, (primary || selected) && s.activeText]}>{label}</Text>
    </Pressable>
  );
}

function FoodPhoto({ fish = false, place = false }: { fish?: boolean; place?: boolean }) {
  return (
    <View style={s.photo} pointerEvents="none">
      <Image source={fish ? salmon : ramen} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.88)"]} style={s.photoCaption}>
        <Text style={s.captionKind}>{place ? "Sample restaurant" : "Cook In · Recipe"}</Text>
        <Text style={s.captionTitle}>{place ? "The Grill House" : fish ? "Lemon Herb Salmon" : "Homemade Ramen"}</Text>
      </LinearGradient>
    </View>
  );
}

function PracticeSwipe({ height, onVote }: { height: number; onVote: (vote: SwipeVote) => void }) {
  const [width, setWidth] = useState(0);
  const reveal = useSharedValue(0);
  const choice = useRef<SwipeVote | null>(null);
  const motion = useDishCardMotion(width, height, true, reveal, (vote) => {
    choice.current = vote;
    return true;
  }, () => {
    if (choice.current) onVote(choice.current);
  });

  return (
    <>
      <View style={[s.deck, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <FoodPhoto fish />
        <GestureDetector gesture={motion.pan} touchAction="none" userSelect="none">
          <Animated.View style={[StyleSheet.absoluteFill, motion.cardStyle]} testID="tutorial-swipe-card">
            <FoodPhoto />
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={s.row}>
        <Action label="Pass" icon="close" onPress={() => motion.swipe("pass")} />
        <Action label="Like" icon="heart" onPress={() => motion.swipe("like")} />
      </View>
    </>
  );
}

export function HowItWorks({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [vote, setVote] = useState<SwipeVote>("like");
  const [restored, setRestored] = useState(false);
  const [diningOut, setDiningOut] = useState(false);
  const [triedModes, setTriedModes] = useState(false);
  const [invite, setInvite] = useState<"closed" | "friends" | "shared">("closed");
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const photoHeight = Math.max(112, Math.min(224, Math.round((height - insets.top - insets.bottom) * 0.26)));
  const instructions = [
    "Drag the practice card right to like it or left to pass. You can also tap the buttons.",
    restored ? "Your first card is back. On a real recipe, tap View recipe for ingredients, servings and a shopping list."
      : `You ${vote === "like" ? "liked" : "passed on"} the ramen. Tap Undo to bring it back.`,
    "Cook In opens on recipes. Tap Dine Out to preview nearby restaurants. In your real deck, tap the meal and distance to change what you see.",
    invite === "closed" ? "Already found a few favorites? Open Friends to invite someone to the deck you’re using."
      : invite === "friends" ? "Try Invite a friend. In a real room you can send a link or give your friend the room code."
        : "Your friend gets the same deck and your earlier swipes count. A match takes at least two people and more than half the group. Everyone’s votes stay private.",
  ];

  function back() {
    if (step === 1) setRestored(false);
    if (step === 2) setTriedModes(false);
    if (step === 3) setInvite("closed");
    setStep(step - 1);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={[s.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}>
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.header}>
            <Text style={s.step}>Practice · {step + 1} of {lessons.length}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close tutorial" onPress={onClose} style={s.close}>
              <Ionicons name="close" size={23} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView key={step} bounces={false} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.title}>{lessons[step]}</Text>
            <Text accessibilityLiveRegion="polite" style={s.description}>{instructions[step]}</Text>
            {step === 0 && <PracticeSwipe height={photoHeight} onVote={(v) => { setVote(v); setRestored(false); setStep(1); }} />}
            {step === 1 && (
              <>
                <View style={[s.deck, { height: photoHeight }]}><FoodPhoto fish={!restored} /></View>
                {restored ? <Action primary label="Try the modes" onPress={() => { setDiningOut(false); setTriedModes(false); setStep(2); }} />
                  : <Action label="Undo" icon="arrow-undo" onPress={() => setRestored(true)} />}
              </>
            )}
            {step === 2 && (
              <>
                <View style={s.row}>
                  <Action label="Cook In" selected={!diningOut} onPress={() => setDiningOut(false)} />
                  <Action label="Dine Out" selected={diningOut} onPress={() => { setDiningOut(true); setTriedModes(true); }} />
                </View>
                <View style={[s.deck, { height: photoHeight }]}><FoodPhoto fish={diningOut} place={diningOut} /></View>
                {triedModes && <Action primary label="Try inviting" onPress={() => { setInvite("closed"); setStep(3); }} />}
              </>
            )}
            {step === 3 && (
              <View style={s.preview}>
                {invite === "closed" && <Action label="Friends" icon="people-outline" onPress={() => setInvite("friends")} />}
                {invite === "friends" && <Action primary label="Invite a friend" icon="share-outline" onPress={() => setInvite("shared")} />}
                {invite === "shared" && (
                  <>
                    <Text style={s.step}>Example room code</Text>
                    <Text style={s.code}>K7Q2XM</Text>
                    <Text style={s.description}>Joining someone? Open Friends and tap Join with a code.</Text>
                    <Action primary label="Start swiping" onPress={onClose} />
                  </>
                )}
              </View>
            )}
          </ScrollView>
          {step > 0 && <Pressable accessibilityRole="button" onPress={back} style={s.back}>
            <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} /><Text style={s.backText}>Back</Text>
          </Pressable>}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.74)" },
  sheet: { width: "100%", maxWidth: 420, maxHeight: "100%", flexShrink: 1, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingLeft: 20, paddingRight: 8, paddingTop: 4 },
  step: { color: Colors.accentGold, fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  close: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 20, paddingBottom: 18, gap: 12 },
  title: { fontFamily: "Poppins_700Bold", fontSize: 25, lineHeight: 33, color: Colors.text },
  description: { fontFamily: "Poppins_400Regular", fontSize: 15, lineHeight: 22, color: "#D8D8D8" },
  deck: { borderRadius: 16, overflow: "hidden" },
  photo: { flex: 1, borderRadius: 16, overflow: "hidden", justifyContent: "flex-end", backgroundColor: Colors.surfaceElevated },
  photoCaption: { padding: 12, paddingTop: 28 },
  captionKind: { color: "#FFE0AA", fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  captionTitle: { color: Colors.text, fontFamily: "Poppins_700Bold", fontSize: 20 },
  row: { flexDirection: "row", gap: 10 },
  action: { flexGrow: 1, minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 8 },
  pressed: { opacity: 0.8 },
  active: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  actionText: { color: Colors.text, fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  activeText: { color: Colors.background },
  preview: { borderRadius: 16, padding: 16, backgroundColor: Colors.background, gap: 12 },
  code: { fontSize: 32, letterSpacing: 5, fontFamily: "Poppins_700Bold", color: Colors.accent },
  back: { flexDirection: "row", minHeight: 44, paddingHorizontal: 16, gap: 4, alignItems: "center", alignSelf: "flex-start" },
  backText: { color: Colors.textSecondary, fontFamily: "Poppins_500Medium", fontSize: 14 },
});
