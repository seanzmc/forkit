import React, { useEffect } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { SwipeScreen } from "@/components/SwipeScreen";
import { takeLaunchMatch } from "@/lib/push";

export default function Home() {
  const { join } = useLocalSearchParams<{ join?: string }>();
  useEffect(() => {
    if (join) return;
    takeLaunchMatch().then(match => {
      if (match) router.replace({ pathname: "/match", params: { dish: JSON.stringify(match.dish), code: match.code, meal: match.meal, sample: match.sample } });
    });
  }, [join]);
  return join ? <Redirect href={{ pathname: "/swipe/[code]", params: { code: join.toUpperCase() } }} /> : <SwipeScreen />;
}
