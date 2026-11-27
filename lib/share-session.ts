import { Platform, Share } from "react-native";
import { getApiUrl } from "./query-client";

export function joinLink(code: string): string {
  return new URL(`join/${code.toUpperCase()}`, getApiUrl()).href;
}

export async function shareSessionCode(code: string): Promise<string> {
  const url = joinLink(code);
  try {
    if (Platform.OS === "web") {
      if (navigator.share) {
        await navigator.share({ title: "Swipe with me on ForkIt", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return "Invite link copied.";
      } else return "Share the room code with your friend.";
    } else {
      await Share.share({
        title: "Swipe with me on ForkIt",
        message: `Swipe with me on ForkIt! ${url}\n\nOr open Friends, tap Join with a code, and enter ${code.toUpperCase()}.`,
      });
    }
    return "";
  } catch (e) {
    return e instanceof Error && e.name === "AbortError" ? "" : "You can share the room code above.";
  }
}
