import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";

// Dine-out cards pair a real restaurant with a dish picked from a cuisine
// table, not from that restaurant's menu. Label them so nobody expects the
// restaurant to actually serve the dish shown. Its photo, when an example
// photo, is what the dish looks like in general, not at this restaurant.
//
// Chain dishes are the opposite case: real items from that chain's menu, so
// they say so instead. Those from our own list may show an example photo of
// that kind of dish, which says so too.
export function SuggestedDishLabel({ dish }: { dish: Dish }) {
  if (dish.menuSource) {
    return (
      <View style={styles.row}>
        <Ionicons name="checkmark-circle" size={12} color={Colors.green} />
        <Text style={[styles.text, styles.onMenu]}>
          {dish.photoCredit ? "On the menu · example photo" : "On the menu"}
        </Text>
      </View>
    );
  }
  if (!dish.suggested) return null;
  return (
    <View style={styles.row}>
      <Ionicons name="sparkles-outline" size={12} color={Colors.accentGold} />
      <Text style={styles.text}>
        {dish.photoCredit ? "Suggested dish · example photo" : "Suggested dish · check the menu"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  onMenu: {
    color: Colors.green,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: Colors.accentGold,
  },
});
