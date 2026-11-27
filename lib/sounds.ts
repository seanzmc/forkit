import { AppState } from "react-native";
import { playClip, prepareClips } from "./cue-player";

const clips = {
  like: require("../assets/sounds/swipe_like.wav"),
  pass: require("../assets/sounds/swipe_pass.wav"),
  match: require("../assets/sounds/dinner_bell.wav"),
};

export function warmSounds() {
  void prepareClips(Object.values(clips)).catch(() => {});
}

export function playCue(cue: keyof typeof clips) {
  if (AppState.currentState === "active") void playClip(clips[cue]).catch(() => {});
}

// A room has one final match. Its live socket and foreground push can arrive
// in either order, including after navigation to another screen.
const recentMatches = new Set<string>();
export function ringForMatch(code: string) {
  if (AppState.currentState !== "active" || recentMatches.has(code)) return;
  recentMatches.add(code);
  if (recentMatches.size > 32) recentMatches.delete(recentMatches.values().next().value!);
  playCue("match");
}
