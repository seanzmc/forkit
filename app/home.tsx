import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { apiRequest } from "@/lib/query-client";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<"create" | "join">("create");

  useEffect(() => {
    AsyncStorage.getItem("userName").then((n) => {
      if (n) setUserName(n);
      else router.replace("/");
    });
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest("POST", "/api/sessions");
      const { code } = await res.json();
      router.push(`/session/${code}`);
    } catch {
      Alert.alert("Error", "Could not create session. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    setJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest("GET", `/api/sessions/${code}`);
      if (!res.ok) throw new Error("Not found");
      router.push(`/session/${code}`);
    } catch {
      Alert.alert("Invalid Code", "No session found with that code.");
    } finally {
      setJoining(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userName");
    router.replace("/");
  };

  return (
    <LinearGradient colors={["#0F0F0F", "#1A0A00", "#0F0F0F"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey {userName}</Text>
            <Text style={styles.subGreeting}>Ready to find dinner?</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.avatarBtn}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.heroCard}>
          <LinearGradient
            colors={["rgba(255,107,53,0.15)", "rgba(255,107,53,0.03)"]}
            style={styles.heroGradient}
          >
            <View style={styles.heroIconRow}>
              <View style={styles.heroIcon}>
                <Ionicons name="restaurant" size={28} color={Colors.accent} />
              </View>
              <Ionicons name="heart" size={20} color={Colors.accent} style={{ marginTop: 4 }} />
              <View style={styles.heroIcon}>
                <Ionicons name="people" size={28} color={Colors.accent} />
              </View>
            </View>
            <Text style={styles.heroTitle}>Swipe together,{"\n"}eat together</Text>
            <Text style={styles.heroSubtitle}>
              Create a room and invite your crew. Swipe right on dishes you love.
              When enough people agree — that's dinner.
            </Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.tabs}>
          <Pressable
            style={[styles.tabBtn, tab === "create" && styles.tabBtnActive]}
            onPress={() => setTab("create")}
          >
            <Text style={[styles.tabText, tab === "create" && styles.tabTextActive]}>
              Create Room
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === "join" && styles.tabBtnActive]}
            onPress={() => setTab("join")}
          >
            <Text style={[styles.tabText, tab === "join" && styles.tabTextActive]}>
              Join Room
            </Text>
          </Pressable>
        </Animated.View>

        {tab === "create" ? (
          <Animated.View entering={FadeInDown.delay(50)} key="create" style={styles.panel}>
            <MaterialCommunityIcons name="door-open" size={40} color={Colors.accent} style={styles.panelIcon} />
            <Text style={styles.panelTitle}>Host a Session</Text>
            <Text style={styles.panelDesc}>
              Get a unique room code to share with your group. You'll control when the swiping starts.
            </Text>
            <Pressable
              onPress={handleCreate}
              disabled={creating}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: pressed || creating ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                {creating ? (
                  <Text style={styles.actionBtnText}>Creating...</Text>
                ) : (
                  <>
                    <Ionicons name="add-circle" size={22} color="#fff" />
                    <Text style={styles.actionBtnText}>Create Room</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(50)} key="join" style={styles.panel}>
            <Ionicons name="enter-outline" size={40} color={Colors.accent} style={styles.panelIcon} />
            <Text style={styles.panelTitle}>Join a Session</Text>
            <Text style={styles.panelDesc}>
              Enter the 6-character code shared by your host.
            </Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter code (e.g. ABC123)"
              placeholderTextColor={Colors.textMuted}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
            <Pressable
              onPress={handleJoin}
              disabled={joining || joinCode.trim().length < 4}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: pressed || joining || joinCode.trim().length < 4 ? 0.6 : 1 },
              ]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                {joining ? (
                  <Text style={styles.actionBtnText}>Joining...</Text>
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={22} color="#fff" />
                    <Text style={styles.actionBtnText}>Join Room</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.2)",
  },
  heroGradient: {
    padding: 24,
    gap: 12,
  },
  heroIconRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  panelIcon: {
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  panelDesc: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  codeInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    letterSpacing: 6,
    textAlign: "center",
    width: "100%",
  },
  actionBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 28,
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
});
