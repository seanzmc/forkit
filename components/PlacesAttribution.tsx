import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";

// Google Places policy: content from Places must be shown with "Google Maps"
// attribution, and photos with their author credit. Only Places-backed dine-out
// cards (those carrying a placeId) need it; curated/fallback dishes do not.
//
// Example dish photos come from Wikimedia Commons instead; their CC licenses
// require author, license and source. Pass `linked` where taps reach the text
// (the match screen) to link the license and the file page; on a swipe card
// the card itself takes the touch.
export function PlacesAttribution({ dish, linked }: { dish: Dish; linked?: boolean }) {
  if (!dish.placeId && !dish.photoCredit) return null;
  const open = (url: string) => () => {
    Linking.openURL(url).catch(() => {});
  };
  const example = dish.photoCredit;
  const placesCredit = dish.photoAuthors?.length
    ? `Photo: ${dish.photoAuthors.join(", ")}`
    : "";
  return (
    <View style={styles.row}>
      {!!dish.placeId && <Text style={styles.text}>Google Maps</Text>}
      {example ? (
        // Two lines so a long author name can't push the license out of view.
        <Text style={[styles.text, styles.credit]} numberOfLines={2}>
          {dish.placeId ? "· " : ""}Photo: {example.author} ·{" "}
          <Text
            style={linked && example.licenseUrl ? styles.link : undefined}
            onPress={linked && example.licenseUrl ? open(example.licenseUrl) : undefined}
          >
            {example.license}
          </Text>{" "}
          ·{" "}
          <Text style={linked && styles.link} onPress={linked ? open(example.pageUrl) : undefined}>
            Wikimedia Commons
          </Text>
        </Text>
      ) : (
        !!placesCredit && (
          <Text style={[styles.text, styles.credit]} numberOfLines={1}>
            · {placesCredit}
          </Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    // Top-aligned so a two-line example-photo credit lines up with "Google Maps".
    alignItems: "flex-start",
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
  link: {
    textDecorationLine: "underline",
  },
});
