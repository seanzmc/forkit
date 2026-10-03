import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { ReviewedSwipe } from "@/lib/swipe-review";

// What this device swiped right and left on, in swipe order. Text only: Places
// photos would each need their author credit shown alongside.
export function SwipeReview({ swipes }: { swipes: ReviewedSwipe[] }) {
  if (swipes.length === 0) return null;
  const liked = swipes.filter((s) => s.vote === "like");
  const passed = swipes.filter((s) => s.vote === "pass");
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Your swipes</Text>
      <Section title="Swiped right" icon="heart" color={Colors.green} items={liked} />
      <Section title="Swiped left" icon="close" color={Colors.red} items={passed} />
    </View>
  );
}

function Section({
  title,
  icon,
  color,
  items,
}: {
  title: string;
  icon: "heart" | "close";
  color: string;
  items: ReviewedSwipe[];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.sectionTitle, { color }]}>
          {title} ({items.length})
        </Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>Nothing</Text>
      ) : (
        items.map(({ dish }) => {
          const [main, sub] =
            dish.mode === "cook-in" || dish.restaurantOnly
              ? [dish.restaurantOnly ? dish.restaurant : dish.name, dish.cuisine]
              : [dish.name, dish.restaurant];
          return (
            <View key={dish.id} style={styles.row}>
              <Text style={styles.main} numberOfLines={1}>
                {main}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {sub}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  heading: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  empty: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
  },
  row: {
    paddingLeft: 20,
  },
  main: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: Colors.text,
  },
  sub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
});
