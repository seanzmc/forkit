import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { SheetButton, sheetStyles as s } from "./SwipeSheet";
import { VersionLabel } from "./VersionLabel";
import { getApiUrl } from "@/lib/query-client";
import type { SessionState } from "@/lib/websocket";

export function SessionPanel({
  session,
  shared,
  connected,
  userId,
  name,
  total,
  count,
  busy,
  onName,
  onSaveName,
  onInvite,
  onJoin,
  onLeave,
  onHelp,
  onHistory,
  onClose,
  tourTarget,
}: {
  session: SessionState | null;
  shared: boolean;
  connected: boolean;
  userId: string;
  name: string;
  total: number;
  count: number;
  busy: boolean;
  onName: (name: string) => void;
  onSaveName: () => void;
  onInvite: () => void;
  onJoin: (code: string) => void;
  onLeave: () => void;
  onHelp: () => void;
  onHistory: () => void;
  onClose: () => void;
  tourTarget?: React.Ref<React.ComponentRef<typeof View>>;
}) {
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const valid = /^[A-Z0-9]{4,8}$/.test(code.trim().toUpperCase());
  return (
    <>
      {shared && session?.members.some((m) => m.id === userId) && (
        <>
          <Text style={s.label}>Room code</Text>
          <Text selectable style={styles.code}>
            {session.code}
          </Text>
        </>
      )}
      <SheetButton
        ref={tourTarget}
        primary
        label={shared ? "Share invite" : "Invite a friend"}
        onPress={onInvite}
        disabled={busy || (shared && !connected)}
      />
      <View pointerEvents={tourTarget ? "none" : "auto"} aria-hidden={!!tourTarget}
        importantForAccessibility={tourTarget ? "no-hide-descendants" : "auto"} style={styles.fields}>
        {!shared &&
          (joining ? (
            <>
              <TextInput
                accessibilityLabel="Room code"
                placeholder="Room code"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={() => {
                  if (valid && !busy) onJoin(code);
                }}
                returnKeyType="go"
                style={s.input}
              />
              <SheetButton label="Join and swipe" disabled={busy || !valid} onPress={() => onJoin(code)} />
            </>
          ) : (
            <SheetButton label="Join with a code" onPress={() => setJoining(true)} disabled={busy} />
          ))}
        <Text style={s.label}>Your name (optional)</Text>
        <TextInput
          accessibilityLabel="Your name"
          placeholder="Guest"
          placeholderTextColor={Colors.textSecondary}
          value={name}
          onChangeText={onName}
          // onBlur, not onEndEditing: react-native-web ignores onEndEditing.
          // Closing the sheet also saves, for a field that never loses focus.
          onBlur={onSaveName}
          onSubmitEditing={onSaveName}
          maxLength={24}
          returnKeyType="done"
          style={s.input}
        />
        {shared && session && (
          <>
            <Text style={s.label}>Members ({session.members.length})</Text>
            {session.members.map((m) => (
              <View key={m.id} style={styles.member}>
                <Text numberOfLines={2} style={[s.secondary, styles.memberName]}>
                  {m.name}
                  {m.id === userId ? " (you)" : ""}
                  {m.id === session.hostId ? " · Host" : ""}
                  {m.away ? " · Away" : ""}
                </Text>
                <Text style={s.secondary}>
                  {m.id === userId ? count : (m.swiped ?? 0)}/{total}
                </Text>
              </View>
            ))}
            <Text style={s.secondary}>Your votes are private. A match needs at least two people to agree.</Text>
          </>
        )}
        {shared && <SheetButton label="Leave group" onPress={onLeave} disabled={busy} />}
        {count > 0 && <SheetButton label="Review your swipes" onPress={onHistory} />}
        <View style={styles.links}>
          <Pressable accessibilityRole="button" onPress={onHelp} style={styles.link}>
            <Text style={s.link}>How it works</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(new URL("/terms", getApiUrl()).href)}
            style={styles.link}
          >
            <Text style={s.link}>Terms and privacy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              onClose();
              router.push("/notices");
            }}
            style={styles.link}
          >
            <Text style={s.link}>Notices</Text>
          </Pressable>
        </View>
        <VersionLabel />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 12 },
  code: { fontSize: 30, color: Colors.accent, letterSpacing: 5, fontFamily: "Poppins_700Bold" },
  member: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  memberName: { flex: 1 },
  links: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around", gap: 8 },
  link: { minHeight: 44, justifyContent: "center" },
});
