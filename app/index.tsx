import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "@/constants/colors";
import { DishCard } from "@/components/DishCard";
import { RecipeDetails } from "@/components/RecipeDetails";
import { shuffleRecipes, type Dish } from "@/lib/food-data";
import { takeLaunchMatch } from "@/lib/push";

export default function QuickSwipeScreen() {
  const { join } = useLocalSearchParams<{ join?: string }>();
  const [deck, setDeck] = useState(shuffleRecipes);
  const [index, setIndex] = useState(0);
  const [recipe, setRecipe] = useState<Dish | null>(null);
  const current = deck[index];

  useEffect(() => {
    if (join) return;
    takeLaunchMatch().then((match) => {
      if (match) router.replace({
        pathname: "/match",
        params: { dish: JSON.stringify(match.dish), code: match.code, meal: match.meal, sample: match.sample },
      });
    });
  }, [join]);

  if (join) return <Redirect href={{ pathname: "/session/[code]", params: { code: join } }} />;

  function swipe(vote: "like" | "pass", dish: Dish) {
    if (dish !== current || recipe) return;
    Haptics.selectionAsync();
    setIndex(index + 1);
    if (vote === "like") setRecipe(dish);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View>
        <Text style={styles.title}>What sounds good?</Text>
        <Text style={styles.hint}>Swipe right for the recipe, left to pass.</Text>
      </View>
      <View style={styles.stack}>
        {current ? (
          <DishCard key={current.id} dishes={[current]} onSwipe={swipe} isTop scale={1} offset={0} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.title}>You’ve seen every recipe.</Text>
            <Pressable accessibilityRole="button" style={styles.control} onPress={() => {
              setDeck(shuffleRecipes());
              setIndex(0);
            }}>
              <Text style={styles.link}>Shuffle again</Text>
            </Pressable>
          </View>
        )}
      </View>
      {current && (
        <View style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Pass" style={styles.control} onPress={() => swipe("pass", current)}>
            <Ionicons name="close" size={24} color={Colors.red} />
            <Text style={styles.buttonText}>Pass</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="See recipe" style={styles.control} onPress={() => swipe("like", current)}>
            <Ionicons name="heart" size={22} color={Colors.green} />
            <Text style={styles.buttonText}>See recipe</Text>
          </Pressable>
        </View>
      )}
      <Pressable accessibilityRole="button" style={styles.nav} onPress={() => router.push("/name")}>
        <Text style={styles.link}>Dine out or swipe with friends</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
      </Pressable>
      <Modal visible={!!recipe} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRecipe(null)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.sheet}>
            <Pressable accessibilityRole="button" style={styles.nav} onPress={() => setRecipe(null)}>
              <Ionicons name="arrow-back" size={18} color={Colors.accent} />
              <Text style={styles.link}>Keep swiping</Text>
            </Pressable>
            {recipe && (
              <ScrollView contentContainerStyle={styles.details}>
                <Text style={styles.title}>{recipe.name}</Text>
                <RecipeDetails key={recipe.id} dish={recipe} />
              </ScrollView>
            )}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, padding: 16, gap: 12 },
  sheet: { flex: 1, backgroundColor: Colors.background },
  stack: { flex: 1, position: "relative" },
  details: { padding: 18, gap: 16 },
  title: { color: Colors.text, fontSize: 24, fontFamily: "Poppins_700Bold" },
  hint: { color: Colors.textSecondary, fontSize: 14, fontFamily: "Poppins_400Regular" },
  row: { flexDirection: "row", justifyContent: "center", gap: 14 },
  control: {
    minHeight: 48, paddingHorizontal: 20, borderRadius: 24, backgroundColor: Colors.surface,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  nav: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  link: { color: Colors.accent, fontSize: 15, fontFamily: "Poppins_600SemiBold" },
  buttonText: { color: Colors.text, fontSize: 15, fontFamily: "Poppins_600SemiBold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
});
