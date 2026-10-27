import React, { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { Dish } from "@/lib/food-data";
import { RECIPE_DETAILS, shoppingListText } from "@/lib/recipes";

// The matched recipe: ingredients (tap to tick off while shopping or cooking)
// and the method. Ticks live only on this screen.
export function RecipeDetails({ dish }: { dish: Dish }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const recipe = dish.mode === "cook-in" ? RECIPE_DETAILS[dish.id] : undefined;
  if (!recipe) return null;

  const toggle = (key: string) => {
    Haptics.selectionAsync();
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const share = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({
      message: shoppingListText(dish.name, recipe),
      title: `Shopping list: ${dish.name}`,
    }).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Ingredients</Text>
          {!!dish.servings && <Text style={styles.headingNote}>Serves {dish.servings}</Text>}
        </View>
        {recipe.ingredients.map((group, g) => (
          <View key={g} style={styles.group}>
            {!!group.title && <Text style={styles.groupTitle}>{group.title}</Text>}
            {group.items.map((item, i) => {
              const key = `${g}-${i}`;
              const done = checked.has(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggle(key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  style={styles.ingredientRow}
                >
                  <Ionicons
                    name={done ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={done ? Colors.green : Colors.textMuted}
                  />
                  <Text style={[styles.ingredientText, done && styles.ingredientDone]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Pressable
          onPress={share}
          accessibilityRole="button"
          style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="share-outline" size={18} color={Colors.accent} />
          <Text style={styles.shareText}>Share shopping list</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Steps</Text>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
        {!!recipe.tip && (
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={16} color={Colors.accentGold} />
            <Text style={styles.tipText}>{recipe.tip}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  card: {
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  headingNote: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: Colors.accentGold,
  },
  group: {
    gap: 6,
  },
  groupTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.accent,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 2,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  ingredientDone: {
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  shareText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.text,
    lineHeight: 22,
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,179,71,0.08)",
    borderRadius: 12,
    padding: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
