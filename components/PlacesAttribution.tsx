import React from "react";
import { StyleSheet, Text } from "react-native";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";

// Google Places policy: content from Places must be shown with "Google Maps"
// attribution, and photos with their author credit. Only Places-backed dine-out
// cards (those carrying a placeId) need it; curated/fallback dishes do not.
export function PlacesAttribution({ dish }: { dish: Dish }) {
  if (!dish.placeId) return null;
  const credit = dish.photoAuthor ? `Photo: ${dish.photoAuthor} · ` : "";
  return (
    <Text style={styles.text} numberOfLines={1}>
      {credit}Google Maps
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
});
