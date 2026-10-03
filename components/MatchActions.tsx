import React from "react";
import {
  ActionSheetIOS,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// What to do once the group has picked a restaurant. Delivery apps and
// reservation sites have no public links we can rely on, so ordering and
// booking go through the restaurant's Google Maps page, which shows its own
// Order and Reserve buttons where the restaurant offers them.
export function MatchActions({ dish }: { dish: Dish }) {
  if (dish.mode === "cook-in" || !dish.placeId) return null;

  const destination = [dish.restaurant, dish.address].filter(Boolean).join(", ");
  const googleDirections =
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(destination) +
    "&destination_place_id=" +
    encodeURIComponent(dish.placeId);
  const appleDirections =
    "https://maps.apple.com/?daddr=" + encodeURIComponent(destination);
  const mapsPage =
    dish.mapsUrl ||
    "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(destination) +
      "&query_place_id=" +
      encodeURIComponent(dish.placeId);

  const open = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch(() => {});
  };

  const directions = () => {
    if (Platform.OS !== "ios") return open(googleDirections);
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ["Apple Maps", "Google Maps", "Cancel"], cancelButtonIndex: 2 },
      (i) => {
        if (i === 0) open(appleDirections);
        else if (i === 1) open(googleDirections);
      }
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{"Let's go"}</Text>
      <View style={styles.grid}>
        <Action icon="navigate" label="Directions" onPress={directions} primary />
        <Action icon="map-outline" label="Google Maps" onPress={() => open(mapsPage)} />
        {!!dish.phone && (
          <Action
            icon="call-outline"
            label="Call"
            onPress={() => open(`tel:${dish.phone!.replace(/[^\d+]/g, "")}`)}
          />
        )}
        {!!dish.website && (
          <Action icon="globe-outline" label="Website" onPress={() => open(dish.website!)} />
        )}
      </View>
      <Text style={styles.hint}>
        Menu, ordering and reservations are on the Google Maps page when the
        restaurant offers them.
      </Text>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={primary ? "#fff" : Colors.accent} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  heading: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  action: {
    flexGrow: 1,
    flexBasis: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionPrimary: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  actionText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  actionTextPrimary: {
    color: "#fff",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
  },
});
