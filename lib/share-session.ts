import { Share } from "react-native";

// Invite text for a session code; used by the lobby and the in-game panel.
export function shareSessionCode(code: string) {
  return Share.share({
    message: `Join my ForkIt session! Code: ${code.toUpperCase()}\n\nLet's decide what to eat together.`,
    title: "ForkIt - Join my session",
  });
}
