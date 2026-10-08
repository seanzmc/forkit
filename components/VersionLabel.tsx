import React from "react";
import { StyleSheet, Text } from "react-native";
import Colors from "@/constants/colors";
import { appVersionLabel } from "@/lib/app-version";

// Small, muted version + build stamp so screenshots identify the build.
export function VersionLabel() {
  if (!appVersionLabel) return null;
  return (
    <Text style={styles.text} accessibilityLabel={`App version ${appVersionLabel}`}>
      {appVersionLabel}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
});
