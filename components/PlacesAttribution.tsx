import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import type { Dish, PlacePhotoAuthor } from "@/lib/food-data";

function open(url: string) {
  return () => { Linking.openURL(url).catch(() => {}); };
}

export function PlaceDetailsAttribution({ dish }: { dish: Dish }) {
  if (!dish.placeId || dish.placeReference) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.provider}>Google Maps</Text>
      {dish.placeAttributions?.map(({ provider, providerUri }) => (
        <Text
          key={providerUri ?? provider}
          style={[styles.text, providerUri ? styles.link : null]}
          accessibilityRole={providerUri ? "link" : undefined}
          onPress={providerUri ? open(providerUri) : undefined}
        >
          {provider}
        </Text>
      ))}
    </View>
  );
}

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
  const example = dish.photoCredit;
  const googlePhoto = dish.placePhotoCredit;
  const authors: PlacePhotoAuthor[] = googlePhoto?.authors ??
    (dish.photoAuthors ?? []).map((displayName) => ({ displayName }));
  return (
    <View style={styles.row}>
      <PlaceDetailsAttribution dish={dish} />
      {dish.menuSource === "spoonacular" ? (
        // The photo is spoonacular's unless the item had none, in which case
        // it is the place's own Google photo with its author credit.
        <Text style={[styles.text, styles.credit]} numberOfLines={1}>
          {dish.placeId ? "· " : ""}
          {dish.photoAuthors ? "Menu:" : "Menu & photo:"}{" "}
          <Text style={styles.link} onPress={open("https://spoonacular.com/food-api")}>
            spoonacular
          </Text>
        </Text>
      ) : example ? (
        <Text style={[styles.text, styles.credit]}>
          {dish.placeId ? "· " : ""}Photo ({example.cropped ? "cropped and resized" : "resized"}): {example.author} ·{" "}
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
      ) : null}
      {!!googlePhoto?.googleMapsUri && (
        <Text accessibilityRole="link" style={[styles.text, styles.link]} onPress={open(googlePhoto.googleMapsUri)}>
          View original photo
        </Text>
      )}
      {authors.map((author, index) => (
        <View key={author.uri ?? `${author.displayName}-${index}`} style={styles.author}>
          {!!author.photoUri && <Image source={author.photoUri} cachePolicy="none" style={styles.avatar} />}
          <Text
            style={[styles.text, author.uri ? styles.link : null]}
            accessibilityRole={author.uri ? "link" : undefined}
            onPress={author.uri ? open(author.uri) : undefined}
          >
            Photo by {author.displayName}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  credit: {
    flexShrink: 1,
  },
  provider: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "white",
  },
  author: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  text: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.text,
    flexShrink: 1,
  },
  link: {
    textDecorationLine: "underline",
  },
});
