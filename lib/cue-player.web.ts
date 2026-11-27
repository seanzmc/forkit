import { Asset } from "expo-asset";

// One context unlocks on the first vote. Each play gets a source so an
// immediate server match can ring over the tail of the deciding swipe.
let context: AudioContext | undefined;
const buffers = new Map<number, Promise<AudioBuffer>>();

function load(audio: AudioContext, clip: number) {
  let buffer = buffers.get(clip);
  if (!buffer) {
    buffer = fetch(Asset.fromModule(clip).uri)
      .then((response) => {
        if (!response.ok) throw new Error("Sound asset unavailable");
        return response.arrayBuffer();
      })
      .then((bytes) => audio.decodeAudioData(bytes))
      .catch((error) => {
        buffers.delete(clip);
        throw error;
      });
    buffers.set(clip, buffer);
  }
  return buffer;
}

export async function prepareClips(clips: number[]) {
  const audio = context ??= new AudioContext();
  await Promise.all(clips.map((clip) => load(audio, clip)));
}

export async function playClip(clip: number) {
  const audio = context ??= new AudioContext();
  const started = performance.now();
  const [buffer] = await Promise.all([load(audio, clip), audio.state === "running" || audio.resume()]);
  // Browsers can defer resume until a much later interaction.
  if (document.hidden || performance.now() - started > 1000) return;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  source.start();
}
