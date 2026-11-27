import React, { type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "@/constants/colors";

export function SwipeSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const availableHeight = Math.max(0, height - insets.top - insets.bottom - 72);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View
          style={[
            s.sheet,
            { paddingBottom: insets.bottom, paddingLeft: 18 + insets.left, paddingRight: 18 + insets.right },
          ]}
          accessibilityViewIsModal
        >
          <View style={s.header}>
            <Text style={s.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={s.close}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: availableHeight, flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={s.body}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function SheetButton({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.button, primary && s.primary, (pressed || disabled) && s.dim]}
    >
      <Text style={[s.buttonText, primary && s.primaryText]}>{label}</Text>
    </Pressable>
  );
}

export const sheetStyles = StyleSheet.create({
  label: { color: Colors.text, fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  secondary: { color: Colors.textSecondary, fontFamily: "Poppins_400Regular", fontSize: 14 },
  input: {
    color: Colors.text,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 16,
  },
  error: { color: "#ffb297", fontSize: 14 },
  link: { color: Colors.accent, fontSize: 14, fontFamily: "Poppins_500Medium" },
});
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, flexShrink: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    gap: 8,
  },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: Colors.text, fontFamily: "Poppins_700Bold", fontSize: 21 },
  body: { gap: 12, paddingTop: 6, paddingBottom: 22 },
  button: {
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    padding: 10,
  },
  primary: { backgroundColor: Colors.accent },
  buttonText: { color: Colors.text, fontFamily: "Poppins_600SemiBold", fontSize: 15, textAlign: "center" },
  primaryText: { color: "#201008" },
  dim: { opacity: 0.55 },
});
