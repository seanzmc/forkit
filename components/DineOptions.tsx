import React, { useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { RADII, type DineSettings } from "@/lib/dine-out";
import { DECKS, MEALS } from "@/lib/food-data";
import { SheetButton, sheetStyles as s } from "./SwipeSheet";

function Choices<T extends string | number>({
  title,
  values,
  selected,
  label,
  onSelect,
}: {
  title: string;
  values: readonly T[];
  selected: T;
  label: (v: T) => string;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={s.label}>{title}</Text>
      <View style={styles.row}>
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: v === selected }}
            style={[styles.option, v === selected && styles.selected]}
            onPress={() => onSelect(v)}
          >
            <Text style={styles.text}>{label(v)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function DineOptions({
  settings,
  busy,
  hasVotes,
  noLocation,
  canRefresh,
  onApply,
}: {
  settings: DineSettings;
  busy: boolean;
  hasVotes: boolean;
  noLocation: boolean;
  canRefresh: boolean;
  onApply: (next: DineSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const changed =
    draft.meal !== settings.meal || draft.radius !== settings.radius || draft.deck !== settings.deck;
  return (
    <>
      <Choices
        title="Meal"
        values={MEALS}
        selected={draft.meal}
        label={(m) => m[0].toUpperCase() + m.slice(1)}
        onSelect={(meal) => setDraft({ ...draft, meal })}
      />
      <Choices
        title="Distance"
        values={RADII.map((r) => r.meters)}
        selected={draft.radius}
        label={(v) => Math.round(v / 1609) + " mi"}
        onSelect={(radius) => setDraft({ ...draft, radius })}
      />
      <Choices
        title="Cards"
        values={DECKS}
        selected={draft.deck}
        label={(d) => (d === "places" ? "By place" : "By dish")}
        onSelect={(deck) => setDraft({ ...draft, deck })}
      />
      {noLocation && Platform.OS !== "web" && (
        <SheetButton
          label="Location settings"
          onPress={() => {
            void Linking.openSettings();
          }}
        />
      )}
      {hasVotes && (changed || canRefresh) && (
        <Text style={s.secondary}>Refreshing nearby places starts a new deck.</Text>
      )}
      <SheetButton
        primary
        label={
          busy ? "Finding places…" : changed ? "Apply settings" : canRefresh ? "Find nearby places" : "Done"
        }
        disabled={busy}
        onPress={() => onApply(draft)}
      />
    </>
  );
}
const styles = StyleSheet.create({
  field: { gap: 5 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  option: {
    backgroundColor: Colors.surfaceElevated,
    minHeight: 44,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRadius: 12,
  },
  selected: { backgroundColor: Colors.accentDeep },
  text: { color: Colors.text, fontFamily: "Poppins_500Medium" },
});
