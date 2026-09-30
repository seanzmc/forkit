import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";

// Dishes from Gemini Maps grounding must be followed immediately by their
// Google Maps sources, each reachable in one tap, with "Google Maps" shown
// unmodified. Render this directly after the dish description.
export function GroundedSource({ dish }: { dish: Dish }) {
  const sources = dish.groundedSources;
  if (!sources?.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Ionicons name="sparkles-outline" size={12} color={Colors.accentGold} />
        <Text style={styles.label}>Popular here, summarized from reviews</Text>
      </View>
      {/* No line limit: every source must stay visible and tappable, and
          "Google Maps" goes first so it can never be cut off. */}
      <Text style={styles.sources}>
        <Text style={styles.provider}>Google Maps</Text>
        {sources.map((s) => (
          <Text key={s.uri}>
            {" · "}
            <Text style={styles.link} onPress={() => Linking.openURL(s.uri)}>
              {s.title}
            </Text>
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: Colors.accentGold,
  },
  sources: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  link: {
    textDecorationLine: "underline",
  },
  provider: {
    fontFamily: "Poppins_500Medium",
  },
});
