import type { Dish } from "./food-data";

export type SwipeVote = "like" | "pass";

export interface ReviewedSwipe {
  dish: Dish;
  vote: SwipeVote;
}

// This device's swipes for the current game. The swipe screen records them and
// the match screen reads them back after navigating away, so they live at
// module level instead of in either screen's state.
let swipes: ReviewedSwipe[] = [];

export function resetSwipes() {
  swipes = [];
}

export function recordSwipe(dish: Dish, vote: SwipeVote) {
  swipes = [...swipes.filter((s) => s.dish.id !== dish.id), { dish, vote }];
}

export function undoSwipe(dishId: string) {
  swipes = swipes.filter((s) => s.dish.id !== dishId);
}

export function getSwipes(): ReviewedSwipe[] {
  return swipes;
}
