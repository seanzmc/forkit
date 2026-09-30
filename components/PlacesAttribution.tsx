import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";

// Google Places policy: content from Places must be shown with "Google Maps"
// attribution, and photos with their author credit. Only Places-backed dine-out
// cards (those carrying a placeId) need it; curated/fallback dishes do not.
export function PlacesAttribution({ dish }: { dish: Dish }) {
  if (!dish.placeId) return null;
  const credit = dish.photoAuthors?.length
    ? `Photo: ${dish.photoAuthors.join(", ")}`
    : "";
  return (
    <View style={styles.row}>
      <Text style={styles.text}>Google Maps</Text>
      {!!credit && (
        <Text style={[styles.text, styles.credit]} numberOfLines={1}>
          · {credit}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  credit: {
    flexShrink: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
});
