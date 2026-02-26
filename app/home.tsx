import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { apiRequest } from "@/lib/query-client";

const RADIUS_OPTIONS = [
  { label: "1 mi", value: 1609 },
  { label: "3 mi", value: 4828 },
  { label: "5 mi", value: 8047 },
  { label: "10 mi", value: 16093 },
  { label: "25 mi", value: 40234 },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [selectedRadius, setSelectedRadius] = useState(2);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [locationPermission, requestPermission] = Location.useForegroundPermissions();

  useEffect(() => {
    AsyncStorage.getItem("userName").then((n) => {
      if (n) setUserName(n);
      else router.replace("/");
    });
    AsyncStorage.getItem("selectedRadius").then((r) => {
      if (r) setSelectedRadius(parseInt(r, 10));
    });
  }, []);

  useEffect(() => {
    if (locationPermission?.granted) {
      setLocationStatus("granted");
      getLocation();
    } else if (locationPermission?.status === "denied") {
      setLocationStatus("denied");
    }
  }, [locationPermission]);

  const getLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      console.warn("Could not get location");
    }
  };

  const handleRequestLocation = async () => {
    if (Platform.OS === "web") {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("granted");
      } catch {
        setLocationStatus("denied");
      }
      return;
    }

    const result = await requestPermission();
    if (result?.granted) {
      setLocationStatus("granted");
      getLocation();
    } else {
      setLocationStatus("denied");
    }
  };

  const handleRadiusChange = (index: number) => {
    setSelectedRadius(index);
    AsyncStorage.setItem("selectedRadius", index.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreate = async () => {
    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const body: Record<string, number> = {};
      if (location) {
        body.lat = location.lat;
        body.lng = location.lng;
        body.radius = RADIUS_OPTIONS[selectedRadius].value;
      }
      const res = await apiRequest("POST", "/api/sessions", body);
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

        <Animated.View entering={FadeInDown.delay(150)} style={styles.locationCard}>
          {locationStatus === "granted" && location ? (
            <View style={styles.locationGranted}>
              <View style={styles.locationDot}>
                <Ionicons name="location" size={18} color={Colors.green} />
              </View>
              <View style={styles.locationTextCol}>
                <Text style={styles.locationLabel}>Location active</Text>
                <Text style={styles.locationCoords}>
                  Restaurants near you will be used
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
            </View>
          ) : locationStatus === "denied" ? (
            <View style={styles.locationDenied}>
              <Ionicons name="location-outline" size={24} color={Colors.textMuted} />
              <View style={styles.locationDeniedContent}>
                <Text style={styles.locationDeniedText}>
                  Location denied — using curated picks instead.
                </Text>
                {Platform.OS !== "web" && locationPermission?.canAskAgain ? (
                  <Pressable onPress={handleRequestLocation} style={styles.retryBtn}>
                    <Text style={styles.retryBtnText}>Try Again</Text>
                  </Pressable>
                ) : Platform.OS !== "web" ? (
                  <Pressable onPress={() => Linking.openSettings()} style={styles.retryBtn}>
                    <Text style={styles.retryBtnText}>Open Settings</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : (
            <Pressable onPress={handleRequestLocation} style={styles.locationRequest}>
              <View style={styles.locationDot}>
                <Ionicons name="location-outline" size={18} color={Colors.accent} />
              </View>
              <View style={styles.locationTextCol}>
                <Text style={styles.locationRequestTitle}>Enable Location</Text>
                <Text style={styles.locationRequestSub}>
                  Find restaurants near you
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </Animated.View>

        {locationStatus === "granted" && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.radiusSection}>
            <Text style={styles.radiusSectionTitle}>Search Radius</Text>
            <View style={styles.radiusOptions}>
              {RADIUS_OPTIONS.map((opt, i) => (
                <Pressable
                  key={opt.value}
                  onPress={() => handleRadiusChange(i)}
                  style={[
                    styles.radiusChip,
                    selectedRadius === i && styles.radiusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      selectedRadius === i && styles.radiusChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(250)} style={styles.tabs}>
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
              {location
                ? `Searching within ${RADIUS_OPTIONS[selectedRadius].label} of your location for real restaurants.`
                : "Share a room code with your group. Using curated restaurant picks."}
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
                  <Text style={styles.actionBtnText}>Finding restaurants...</Text>
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
    gap: 16,
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
  locationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  locationGranted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  locationDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(76,175,80,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextCol: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  locationCoords: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  locationDenied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  locationDeniedContent: {
    flex: 1,
    gap: 8,
  },
  locationDeniedText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,107,53,0.12)",
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.accent,
  },
  locationRequest: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  locationRequestTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  locationRequestSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
  },
  radiusSection: {
    gap: 10,
  },
  radiusSectionTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  radiusOptions: {
    flexDirection: "row",
    gap: 8,
  },
  radiusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  radiusChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  radiusChipText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.textSecondary,
  },
  radiusChipTextActive: {
    color: "#fff",
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
