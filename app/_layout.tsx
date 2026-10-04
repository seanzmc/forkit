import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { StatusBar } from "expo-status-bar";
import { onMatchTapped } from "@/lib/push";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  // A match notification tapped while the app is open or backgrounded. The
  // one that cold-starts the app is picked up by the start screen instead.
  useEffect(
    () =>
      onMatchTapped(({ dish }) =>
        router.push({ pathname: "/match", params: { dish: JSON.stringify(dish) } })
      ),
    []
  );

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
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
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
