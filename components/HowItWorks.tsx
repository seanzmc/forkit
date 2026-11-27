import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "@/constants/colors";

export type TourStep = "swipe" | "undo" | "mode" | "round" | "friends" | "invite";
type Bounds = { x: number; y: number; width: number; height: number };

export function HowItWorks({ step, target, cook, shared, onBack, onClose }: {
  step: TourStep;
  target: React.RefObject<React.ComponentRef<typeof View> | null>;
  cook: boolean;
  shared: boolean;
  onBack?: () => void;
  onClose: () => void;
}) {
  const root = useRef<React.ComponentRef<typeof View>>(null);
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [anchor, setAnchor] = useState<Bounds | null>(null);
  const [tipHeight, setTipHeight] = useState(116);
  useLayoutEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => {
      const control = target.current;
      if (!control || !size.width) return;
      root.current?.measureInWindow((left, top) => {
        control.measureInWindow((x, y, width, height) => {
          if (active && width && height) setAnchor({ x: x - left, y: y - top, width, height });
        });
      });
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [step, target, size]);

  const [number, title, message] = ({
    swipe: [1, "Swipe this card", "Drag right to like or left to pass. You can also tap Like or Pass. This swipe is just for practice."],
    undo: [2, "Bring the card back", "Tap the curved arrow between Pass and Like to undo. After a like, Your likes appears below."],
    mode: [3, "Switch the menu", shared
      ? "Cook In has recipes and Dine Out has restaurants. Tap the other mode to see how it works in a shared room."
      : cook ? "View recipe opens ingredients and a shopping list. Tap Dine Out to try nearby restaurants."
        : "Dine Out shows nearby restaurants. Tap Cook In to browse recipes."],
    round: [3, "One deck for the group", "Everyone in this room sees the same deck. Tap Keep swiping to stay with them."],
    friends: [4, "Open Friends", !cook && !shared
      ? "The meal and distance set your search. Tap Friends to invite someone to the deck you’re using."
      : "You can invite someone after you start swiping. Tap Friends to find the invitation on this deck."],
    invite: [5, shared ? "Share this room" : "Invite a friend", "A link or code brings friends into this deck with your earlier swipes. A match takes two people and a majority. Tap to finish practice."],
  } as const)[step];
  const announcement = `Quick tour, step ${number} of 5. ${title}. ${message}`;
  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  const swipe = step === "swipe";
  const inSheet = step === "invite" || step === "round";
  const minY = inSheet ? insets.top + 8 : 8;
  const maxY = size.height - (inSheet ? insets.bottom : 0) - tipHeight - 8;
  const width = Math.min(304, size.width - 24);
  const center = anchor ? anchor.x + anchor.width / 2 : size.width / 2;
  const left = Math.max(12, Math.min(center - width / 2, size.width - width - 12));
  const above = !!anchor && !swipe && anchor.y - tipHeight - 16 >= minY;
  const desiredTop = !anchor ? minY : swipe ? anchor.y + Math.min(70, anchor.height * 0.15)
    : above ? anchor.y - tipHeight - 13 : anchor.y + anchor.height + 13;
  const top = Math.max(minY, Math.min(maxY, desiredTop));
  const pointer = Math.min(width - 26, Math.max(14, center - left - 6));
  const shade = !!anchor && !swipe;
  const x = Math.max(0, (anchor?.x ?? 0) - 3);
  const y = Math.max(0, (anchor?.y ?? 0) - 3);
  const right = Math.min(size.width, (anchor?.x ?? 0) + (anchor?.width ?? 0) + 3);
  const bottom = Math.min(size.height, (anchor?.y ?? 0) + (anchor?.height ?? 0) + 3);

  return (
    <View ref={root} collapsable={false} pointerEvents="box-none" style={s.overlay}
      onLayout={({ nativeEvent: { layout } }) => setSize(old => old.width === layout.width && old.height === layout.height ? old : { width: layout.width, height: layout.height })}>
      {shade && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[s.shade, { left: 0, right: 0, top: 0, height: y }]} />
          <View style={[s.shade, { left: 0, right: 0, top: bottom, bottom: 0 }]} />
          <View style={[s.shade, { left: 0, top: y, width: x, height: bottom - y }]} />
          <View style={[s.shade, { left: right, right: 0, top: y, height: bottom - y }]} />
          <View style={[s.ring, { left: x, top: y, width: right - x, height: bottom - y, borderRadius: step === "undo" ? 30 : 16 }]} />
        </View>
      )}
      {size.width > 0 && (
        <View pointerEvents="box-none" style={[s.tip, { left, top, width }]}
          onLayout={({ nativeEvent: { layout } }) => setTipHeight(layout.height)}>
          {anchor && <View pointerEvents="none" style={[s.pointer, (above || swipe) ? s.pointerDown : s.pointerUp, { left: pointer }]} />}
          <View style={s.surface} pointerEvents="box-none">
            <View style={s.copy} pointerEvents="none" accessible accessibilityRole="text" accessibilityLiveRegion="polite"
              accessibilityLabel={announcement}>
              <Text style={s.count}>Quick tour · {number} of 5</Text>
              <Text style={s.title}>{title}</Text>
              <Text style={s.body}>{message}</Text>
            </View>
            {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Previous tutorial step" style={[s.close, s.back]} onPress={onBack}>
              <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
            </Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="Close tutorial" style={s.close} onPress={onClose}>
              <Ionicons name="close" size={21} color={Colors.text} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 20, elevation: 20 },
  shade: { position: "absolute", backgroundColor: "rgba(0,0,0,0.45)" },
  ring: { position: "absolute", borderWidth: 2, borderColor: Colors.accentGold },
  tip: { position: "absolute", shadowColor: "#000", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
  surface: { borderWidth: 1, borderColor: "#655744", borderRadius: 16, backgroundColor: "#25221F", paddingVertical: 11, paddingLeft: 15, paddingRight: 13 },
  copy: { gap: 3 },
  count: { paddingRight: 74, color: Colors.accentGold, fontFamily: "Poppins_600SemiBold", fontSize: 12, lineHeight: 17 },
  title: { paddingRight: 60, color: Colors.text, fontFamily: "Poppins_700Bold", fontSize: 19, lineHeight: 25 },
  body: { color: "#E8E4DE", fontFamily: "Poppins_400Regular", fontSize: 14, lineHeight: 20 },
  close: { position: "absolute", right: 0, top: 0, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  back: { right: 44 },
  pointer: { position: "absolute", width: 12, height: 12, backgroundColor: "#25221F", borderColor: "#655744", transform: [{ rotate: "45deg" }] },
  pointerDown: { bottom: -5, borderBottomWidth: 1, borderRightWidth: 1 },
  pointerUp: { top: -5, borderTopWidth: 1, borderLeftWidth: 1 },
});
