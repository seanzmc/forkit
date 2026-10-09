import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { SampleReason } from "@/lib/food-data";

// A dine-out room built from the made-up fallback restaurants looks just like
// a real one, so say so before anyone swipes, and on the match screen where
// people look for directions that aren't there.
export function SampleRoomNotice({
  reason,
  isHost,
}: {
  reason?: SampleReason;
  isHost?: boolean;
}) {
  const why =
    reason === "lookup-failed"
      ? "We couldn't look up restaurants just now"
      : reason === "no-restaurants"
      ? isHost
        ? "No open restaurants were found near you"
        : "No open restaurants were found near the host"
      : reason === "no-location"
        ? isHost
          ? "Your location was off when you made this room"
          : "The host's location was off when they made this room"
        : // Opened from a notification: the reason isn't known.
          "This room couldn't find real restaurants nearby";
  const fix =
    reason === "lookup-failed"
      ? "Try a new room in a little while for real places nearby."
      : reason === "no-restaurants"
        ? "Try a bigger distance in a new room for real places nearby."
        : "Make a new room with location on for real places nearby.";

  return (
    <View style={styles.card}>
      <Ionicons name="information-circle" size={20} color={Colors.accentGold} />
      <View style={styles.textCol}>
        <Text style={styles.title}>Sample restaurants</Text>
        <Text style={styles.body}>
          {why}, so it uses made-up places to try the app. They have no
          address, phone or directions. {fix}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,179,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,179,71,0.3)",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.accentGold,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
});
