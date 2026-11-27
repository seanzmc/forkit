import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { AppState } from "react-native";

// Keep the three players across route changes so replacing the swipe screen
// with the match screen never cuts the bell short.
const players = new Map<number, AudioPlayer>();
let audioMode: Promise<void> | undefined;

function playerFor(clip: number) {
  let player = players.get(clip);
  if (!player) {
    player = createAudioPlayer(clip);
    players.set(clip, player);
  }
  return player;
}

function configureAudio() {
  return audioMode ??= setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" })
    .catch((error) => {
      audioMode = undefined;
      throw error;
    });
}

export async function prepareClips(clips: number[]) {
  await configureAudio();
  clips.forEach(playerFor);
}

export async function playClip(clip: number) {
  await configureAudio();
  const player = playerFor(clip);
  if (player.currentTime > 0) await player.seekTo(0);
  if (AppState.currentState === "active") player.play();
}
