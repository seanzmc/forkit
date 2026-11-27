import React from "react";
import { useLocalSearchParams } from "expo-router";
import { SwipeScreen } from "@/components/SwipeScreen";

export default function RoomSwipe() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <SwipeScreen key={code} initialCode={code.toUpperCase()} />;
}
