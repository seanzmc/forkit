import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

export default function SessionLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: "/swipe/[code]", params: { code: code.toUpperCase() } }} />;
}
