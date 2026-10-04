import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { getWsUrl, type SessionState, type WsMessage } from "@/lib/websocket";
import type { Dish } from "@/lib/food-data";
import * as Crypto from "expo-crypto";
import { shareSessionCode } from "@/lib/share-session";
import { getPushToken } from "@/lib/push";

export default function SessionLobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<SessionState | null>(null);
  const [, setDishes] = useState<Dish[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [userId] = useState(() => Crypto.randomUUID());
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(async () => {
    const name = await AsyncStorage.getItem("userName");
    if (!name) {
      router.replace({ pathname: "/", params: { join: code?.toUpperCase() } });
      return;
    }

    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", code: code?.toUpperCase(), userId, name }));
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);

        if (msg.type === "joined") {
          setSession(msg.session);
          setDishes(msg.dishes);
          setIsHost(msg.isHost);
          setStatus("connected");
        } else if (msg.type === "member_joined" || msg.type === "member_left") {
          setSession(msg.session);
        } else if (msg.type === "game_started") {
          setSession(msg.session);
          setDishes(msg.dishes);
          router.replace({
            pathname: "/swipe/[code]",
            params: {
              code: code!,
              userId,
              dishes: JSON.stringify(msg.dishes),
            },
          });
        } else if (msg.type === "error") {
          setStatus("error");
          // Usually an old invite: rooms end when everyone leaves.
          const notFound = msg.message === "Session not found";
          Alert.alert(
            notFound ? "Room not found" : "Error",
            notFound ? "This room has ended or the code is wrong." : msg.message,
            [
              {
                text: "OK",
                onPress: () => {
                  ws.close();
                  if (router.canGoBack()) router.back();
                  else router.replace("/home");
                },
              },
            ]
          );
        }
      } catch {}
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, [code, userId]);

  // Ask for notification permission here, while there's a reason to say yes:
  // the swipe screen sends the token so a match reaches members who leave.
  useEffect(() => {
    getPushToken();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const handleStart = () => {
    if (!wsRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    wsRef.current.send(JSON.stringify({ type: "start" }));
  };

  const handleShare = async () => {
    if (code) await shareSessionCode(code);
  };

  const handleBack = () => {
    wsRef.current?.close();
    // An invite link opens the lobby with nothing behind it.
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  };

  const members = session?.members ?? [];
  const canStart = isHost && members.length >= 1;

  return (
    <LinearGradient colors={["#0F0F0F", "#1A0A00", "#0F0F0F"]} style={styles.container}>
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle}>Waiting Room</Text>
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={22} color={Colors.accent} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)} style={styles.codeCard}>
          <Text style={styles.codeLabel}>Session Code</Text>
          <Text style={styles.codeText}>{code?.toUpperCase()}</Text>
          {session?.mode && (
            <View style={styles.modeBadge}>
              <Ionicons
                name={session.mode === "cook-in" ? "flame-outline" : "restaurant-outline"}
                size={13}
                color={Colors.accent}
              />
              <Text style={styles.modeBadgeText}>
                {session.mode === "cook-in" ? "Cook In" : "Dine Out"}
              </Text>
            </View>
          )}
          <Pressable onPress={handleShare} style={styles.copyRow}>
            <Ionicons name="copy-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.copyText}>Tap to share with your group</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{members.length}</Text>
            </View>
          </View>

          <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false}>
            {status === "connecting" && (
              <View style={styles.memberRow}>
                <View style={styles.avatarLoading} />
                <Text style={styles.memberConnecting}>Connecting...</Text>
              </View>
            )}
            {members.map((m, i) => (
              <Animated.View
                entering={ZoomIn.delay(i * 80)}
                key={m.id}
                style={styles.memberRow}
              >
                <View style={[styles.avatar, m.id === session?.hostId && styles.avatarHost]}>
                  <Text style={styles.avatarLetter}>{m.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {m.name} {m.id === userId ? "(You)" : ""}
                  </Text>
                  {m.id === session?.hostId && (
                    <Text style={styles.hostTag}>Host</Text>
                  )}
                </View>
                {m.id === session?.hostId && (
                  <Ionicons name="star" size={14} color={Colors.accentGold} />
                )}
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.bottom}>
          {isHost ? (
            <>
              <Text style={styles.waitingHint}>
                {members.length < 2
                  ? "Invite at least one friend, or start solo to test!"
                  : `${members.length} people in the room — ready to go!`}
              </Text>
              <Pressable
                onPress={handleStart}
                disabled={!canStart}
                style={({ pressed }) => [
                  styles.startBtn,
                  { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <LinearGradient
                  colors={[Colors.accent, Colors.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startBtnGradient}
                >
                  <Ionicons name="play" size={22} color="#fff" />
                  <Text style={styles.startBtnText}>Start Swiping</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <View style={styles.waitingGuest}>
              <View style={styles.pulseContainer}>
                <Ionicons name="time-outline" size={24} color={Colors.textSecondary} />
              </View>
              <Text style={styles.waitingText}>Waiting for the host to start...</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  codeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.2)",
    gap: 8,
  },
  codeLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  codeText: {
    fontSize: 44,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
    letterSpacing: 8,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,107,53,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modeBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.accent,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copyText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  section: {
    flex: 1,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: "#fff",
  },
  memberList: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,107,53,0.15)",
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHost: {
    borderColor: Colors.accentGold,
  },
  avatarLoading: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
  },
  avatarLetter: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: Colors.text,
  },
  hostTag: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: Colors.accentGold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  memberConnecting: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
  },
  bottom: {
    gap: 12,
  },
  waitingHint: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  startBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  startBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  waitingGuest: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  pulseContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  waitingText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
});
