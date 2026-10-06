import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";

// Google Places policy: content from Places must be shown with "Google Maps"
// attribution, and photos with their author credit. Only Places-backed dine-out
// cards (those carrying a placeId) need it; curated/fallback dishes do not.
//
// Example dish photos come from Wikimedia Commons instead; their CC licenses
// require author, license (linked), source (linked) and a note that we
// modified the photo (every one is resized and recompressed).
// Chain menu items and their photos come from spoonacular, whose free plan
// requires a backlink to its food API page wherever the data is shown.
// The links work on the swipe card too: a tap on them is claimed by the
// text before the card's pan handler, while a drag still moves the card.
export function PlacesAttribution({ dish }: { dish: Dish }) {
  if (!dish.placeId && !dish.photoCredit && !dish.menuSource) return null;
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
      {dish.menuSource === "spoonacular" ? (
        // The photo is spoonacular's unless the item had none, in which case
        // it is the place's own Google photo with its author credit.
        <Text style={[styles.text, styles.credit]} numberOfLines={1}>
          {dish.placeId ? "· " : ""}
          {dish.photoAuthors ? "Menu:" : "Menu & photo:"}{" "}
          <Text style={styles.link} onPress={open("https://spoonacular.com/food-api")}>
            spoonacular
          </Text>
          {placesCredit ? ` · ${placesCredit}` : ""}
        </Text>
      ) : example ? (
        // Two lines so a long author name can't push the license out of view.
        <Text style={[styles.text, styles.credit]} numberOfLines={2}>
          {dish.placeId ? "· " : ""}Photo (resized): {example.author} ·{" "}
          <Text
            style={example.licenseUrl ? styles.link : undefined}
            onPress={example.licenseUrl ? open(example.licenseUrl) : undefined}
          >
            {example.license}
          </Text>{" "}
          ·{" "}
          <Text style={styles.link} onPress={open(example.pageUrl)}>
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
