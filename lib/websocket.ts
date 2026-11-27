import { getApiUrl } from "./query-client";
import type { Deck, Meal, SampleReason, SessionMode } from "./food-data";

export function getWsUrl(): string {
  const apiUrl = getApiUrl();
  // http -> ws, https -> wss, so local dev over plain http still connects
  const wsUrl = apiUrl.replace(/^http(s?):\/\//, "ws$1://");
  return wsUrl.replace(/\/$/, "") + "/ws";
}

export type SessionState = {
  code: string;
  hostId: string;
  status: "lobby" | "swiping" | "matched";
  mode: SessionMode;
  // Dine-out rooms only; absent from older servers.
  meal?: Meal;
  // Dine-out rooms only: one card per place or per dish. Absent from older
  // servers, which always dealt by place.
  deck?: Deck;
  radius?: number;
  // Dine-out rooms using made-up restaurants; absent from older servers.
  sample?: SampleReason;
  // Which round of swiping this is, from 1; repeat when this round's deck is
  // the last one's reshuffled. Absent from older servers.
  round?: number;
  repeat?: boolean;
  // swiped: how many swipes the server holds for that member; away: their
  // socket is closed but they keep their place for a while. Both absent from
  // older servers.
  members: { id: string; name: string; swiped?: number; away?: boolean }[];
  matchedRestaurant?: string;
  matchedDish?: import("./food-data").Dish;
};

// On join the client sends its code, userId, name and optional pushToken.
// The swipe screen asks for absolute counts with supportsSwipeCounts. On
// reconnect it can also send its own private swipes and their round.
// Other client messages: set_name (the current member only), push_token, start, swipe and undo (each with its round, so a vote on an
// earlier round's deck is dropped), new_round (once everyone has swiped through
// with no match), leave (left the room on purpose, so the server drops the
// member at once instead of keeping them as away), ping. Received by the client:
export type WsMessage =
  | { type: "joined"; session: SessionState; dishes: import("./food-data").Dish[]; isHost: boolean }
  | { type: "member_joined"; session: SessionState }
  | { type: "member_left"; memberId: string; session: SessionState }
  | { type: "game_started"; session: SessionState; dishes: import("./food-data").Dish[] }
  | { type: "swipe_update"; memberId: string; swiped: number }
  // Older servers used deltas. Read them during a rolling update.
  | { type: "swipe_update"; memberId: string; vote: "like" | "pass" | "undo" }
  | { type: "match"; session: SessionState; dish: import("./food-data").Dish }
  // Someone asked for another round; its deck follows in new_round.
  | { type: "round_loading" }
  | { type: "new_round"; session: SessionState; dishes: import("./food-data").Dish[] }
  | { type: "error"; message: string }
  | { type: "pong" };
