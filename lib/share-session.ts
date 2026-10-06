import { Share } from "react-native";
import { getApiUrl } from "./query-client";

// The tappable invite for a session. Opens the app straight into the lobby
// when installed (see /join on the server and app/+native-intent.tsx).
export function joinLink(code: string): string {
  return new URL(`join/${code.toUpperCase()}`, getApiUrl()).href;
}

// Invite text for a session code; used by the lobby and the in-game panel.
export function shareSessionCode(code: string) {
  const upper = code.toUpperCase();
  return Share.share({
    message: `Let's swipe right on dinner! Join my ForkIt room: ${joinLink(upper)}\n\nOr open ForkIt, tap Join Room and enter ${upper}.`,
    title: "ForkIt - Swipe right on dinner",
  });
}
