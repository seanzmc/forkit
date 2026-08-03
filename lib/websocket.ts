import { getApiUrl } from "./query-client";
import type { SessionMode } from "./food-data";

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
  members: { id: string; name: string }[];
  matchedRestaurant?: string;
  matchedDish?: import("./food-data").Dish;
};

export type WsMessage =
  | { type: "joined"; session: SessionState; dishes: import("./food-data").Dish[]; isHost: boolean }
  | { type: "member_joined"; session: SessionState }
  | { type: "member_left"; memberId: string; session: SessionState }
  | { type: "game_started"; session: SessionState; dishes: import("./food-data").Dish[] }
  | { type: "swipe_update"; memberId: string; dishId: string; vote: "like" | "pass" }
  | { type: "match"; session: SessionState; dish: import("./food-data").Dish }
  | { type: "error"; message: string }
  | { type: "pong" };
