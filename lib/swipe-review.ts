import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Dish } from "./food-data";

export type SwipeVote = "like" | "pass";
export interface ReviewedSwipe {
  dish: Dish;
  vote: SwipeVote;
}
export type OwnVotes = { round: number; swipes: Record<string, SwipeVote> };

let last: { code: string; userId: string; history: ReviewedSwipe[]; votes: OwnVotes } | undefined;
let pendingWrite = Promise.resolve();
const KEY = "lastSwipeRound";

export function rememberSwipes(code: string, userId: string, round: number, history: ReviewedSwipe[]) {
  const votes = { round, swipes: Object.fromEntries(history.map(({ dish, vote }) => [dish.id, vote])) };
  last = { code, userId, history, votes };
  // Web tabs are independent people. Native can restore the last round after
  // the OS kills the app without putting any private votes in links or public room state.
  if (Platform.OS !== "web") {
    const stored = JSON.stringify({ code, userId, votes });
    pendingWrite = pendingWrite.then(() => AsyncStorage.setItem(KEY, stored)).catch(() => {});
  }
}

export async function ownVotesFor(code: string, userId: string): Promise<OwnVotes | undefined> {
  if (last?.code === code && last.userId === userId) return last.votes;
  if (Platform.OS === "web") return;
  try {
    await pendingWrite;
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
    if (
      saved?.code === code &&
      saved.userId === userId &&
      Number.isInteger(saved.votes?.round) &&
      saved.votes.swipes &&
      typeof saved.votes.swipes === "object"
    )
      return saved.votes;
  } catch {
    /* The room can still be joined without a local copy. */
  }
}

export function getSwipes(code?: string): ReviewedSwipe[] {
  return last && code === last.code ? last.history : [];
}
