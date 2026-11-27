import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { useFonts } from "@expo-google-fonts/poppins/useFonts";
import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { StatusBar } from "expo-status-bar";
import { onMatchTapped } from "@/lib/push";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

// Expo Router supplies zero insets and a zero frame on web. Measure Safari's
// viewport so controls stay clear of the Duo's camera and system buttons.
const WebSafeArea = Platform.OS === "web" ? SafeAreaProvider : React.Fragment;

function RootLayoutNav() {
  // A match notification tapped while the app is open or backgrounded. The
  // one that cold-starts the app is picked up by the start screen instead.
  useEffect(
    () =>
      onMatchTapped(({ dish, meal, sample, code }) =>
        router.push({ pathname: "/match", params: { dish: JSON.stringify(dish), meal, sample, code } })
      ),
    []
  );

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="home" />
      <Stack.Screen name="session/[code]" />
      {/* Card swipes are horizontal pans; the stack's back gesture (full-screen
          on iOS 26+) would otherwise steal a right swipe and leave the game. */}
      <Stack.Screen name="swipe/[code]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="match" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
          <WebSafeArea>
            <StatusBar style="light" />
            <RootLayoutNav />
          </WebSafeArea>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
