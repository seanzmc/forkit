import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  useEffect(() => {
    logoScale.value = withDelay(100, withSpring(1, { damping: 12 }));
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));

    AsyncStorage.getItem("userName").then((storedName) => {
      if (storedName) {
        router.replace("/home");
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Keep the input and "Let's Eat" in view above the keyboard.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      scrollRef.current?.scrollToEnd({ animated: true })
    );
    return () => sub.remove();
  }, []);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem("userName", trimmed);
    router.replace("/home");
  };

  if (loading) return null;

  return (
    <LinearGradient
      colors={["#0F0F0F", "#1A0A00", "#0F0F0F"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Scroll rather than squash: when the keyboard shrinks the space,
            the logo block keeps its height instead of overlapping the form. */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View
            style={[
              styles.content,
              {
                paddingTop: insets.top + (Platform.OS === "web" ? 67 : 60),
                paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
              },
            ]}
          >
            <Animated.View style={[styles.logoContainer, logoStyle]}>
              <View style={styles.logoCircle}>
                <Ionicons name="restaurant" size={48} color={Colors.accent} />
              </View>
              <Text style={styles.appName}>ForkIt</Text>
              <Text style={styles.tagline}>Swipe right on dinner</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formContainer}>
              <Text style={styles.label}>What should we call you?</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name..."
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                autoCapitalize="words"
                maxLength={24}
              />

              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.button,
                  { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  !name.trim() && styles.buttonDisabled,
                ]}
                disabled={!name.trim()}
              >
                <LinearGradient
                  colors={[Colors.accent, Colors.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{"Let's Eat"}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600)} style={styles.footer}>
              <Text style={styles.footerText}>
                Match with friends on the perfect meal
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    gap: 12,
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  appName: {
    fontSize: 52,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  formContainer: {
    gap: 14,
    paddingBottom: 20,
  },
  label: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
});
