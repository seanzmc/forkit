import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import notices from "../assets/artwork-notices.json";

export default function ArtworkNotices() {
  return (
    <SafeAreaView style={styles.page} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Typeface and icon licenses", headerBackTitle: "Back" }} />
      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(notices).map(([name, license]) => (
          <Text key={name} selectable style={styles.text}>
            <Text style={styles.heading}>{name}{"\n"}</Text>
            {license}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { gap: 24, padding: 20, paddingBottom: 48 },
  heading: { fontFamily: "Poppins_600SemiBold", fontSize: 18 },
  text: { color: Colors.text, fontSize: 14, lineHeight: 21 },
});
