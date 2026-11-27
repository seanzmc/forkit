import { useRef } from "react";
import { Platform } from "react-native";
import { usePanGesture } from "react-native-gesture-handler";
import {
  cancelAnimation, clamp, useAnimatedReaction, useAnimatedStyle, useDerivedValue,
  useReducedMotion, useSharedValue, withSpring, type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import type { SwipeVote } from "@/lib/swipe-review";

// The original ForkIt card used this spring, 40% vertical travel, and 25° of
// tilt per screen width. Measure the card itself so the web and Duo agree.
const RETURN_SPRING = { mass: 4, stiffness: 900, damping: 15 };
const THROW_SPRING = { mass: 1, stiffness: 210, damping: 27, overshootClamping: true };
const LIFT_SPRING = { mass: 1, stiffness: 380, damping: 29 };
const VERTICAL_TRAVEL = 0.4;
const MAX_TILT = 16;
const VOTE_FRACTION = 0.3;
const NATIVE_VELOCITY = Platform.OS !== "web";

function sampleVelocity(reported: number, delta: number, dt: number, previous: number) {
  "worklet";
  if (dt <= 0 || dt >= 100) return reported;
  const speed = delta * 1000 / Math.max(8, dt);
  if (NATIVE_VELOCITY) return reported || speed;
  // Safari can coalesce the last few points of a fast flick. Average about
  // two frames of motion, and discard that history when the finger reverses.
  const weight = speed * previous > 0 ? Math.exp(-dt / 30) : 0;
  return speed + (previous - speed) * weight;
}

export function useDishCardMotion(
  width: number,
  height: number,
  isTop: boolean,
  reveal: SharedValue<number>,
  vote: (direction: SwipeVote) => boolean,
  finish: () => void,
) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  const exitEdge = useSharedValue(0);
  const recorded = useRef(false);
  const grab = useSharedValue<{ x: number; y: number; fingerX: number; fingerY: number } | null>(null);
  const lastMove = useSharedValue({ time: 0, x: 0, y: 0, vx: 0, vy: 0 });
  const reduceMotion = useReducedMotion();
  const fraction = useDerivedValue(() => width > 0 ? x.get() / width : 0);
  // Include the tilted corner and the screen gutter before handing off the card.
  const clearDistance = width + height * Math.sin(MAX_TILT * Math.PI / 180) / 2 + 16;

  useAnimatedReaction(
    () => isTop ? Math.min(1, Math.abs(fraction.get()) / 0.75) : null,
    value => { if (value !== null) reveal.set(value); },
  );
  useAnimatedReaction(
    () => exitEdge.get() > 0 && Math.abs(x.get()) >= exitEdge.get(),
    (clear, wasClear) => { if (clear && !wasClear) scheduleOnRN(finish); },
  );

  function settle(vx = 0, vy = 0) {
    "worklet";
    x.set(withSpring(0, { ...RETURN_SPRING, velocity: clamp(vx, -1200, 1200) }));
    y.set(withSpring(0, { ...RETURN_SPRING, velocity: clamp(vy, -1200, 1200) * VERTICAL_TRAVEL }));
    lift.set(withSpring(0, LIFT_SPRING));
  }
  function restoreRejectedVote() {
    "worklet";
    exitEdge.set(0);
    settle();
  }
  function recordGestureVote(direction: SwipeVote) {
    if (recorded.current) return;
    recorded.current = vote(direction);
    if (!recorded.current) scheduleOnUI(restoreRejectedVote);
  }
  function throwCard(direction: SwipeVote, vx: number, vy: number) {
    "worklet";
    if (exitEdge.get() || !isTop || !width) return;
    exitEdge.set(clearDistance);
    const sign = direction === "like" ? 1 : -1;
    const target = sign * Math.max(clearDistance + width * 0.45, sign * x.get() + 16);
    x.set(withSpring(target, { ...THROW_SPRING, velocity: vx }));
    y.set(withSpring(clamp(y.get() * 2 + vy * 0.12, -height / 2, height / 2), {
      ...THROW_SPRING, velocity: vy * VERTICAL_TRAVEL,
    }));
    lift.set(withSpring(0, LIFT_SPRING));
  }

  const pan = usePanGesture({
    enabled: isTop && width > 0,
    minDistance: 3,
    maxPointers: 1,
    onTouchesDown: event => {
      "worklet";
      if (exitEdge.get()) return;
      if (event.numberOfTouches !== 1) {
        grab.set(null);
        settle();
        return;
      }
      const finger = event.changedTouches[0];
      if (!finger) return;
      cancelAnimation(x);
      cancelAnimation(y);
      grab.set({ x: x.get(), y: y.get(), fingerX: finger.absoluteX, fingerY: finger.absoluteY });
      lastMove.set({ time: performance.now(), x: finger.absoluteX, y: finger.absoluteY, vx: 0, vy: 0 });
      lift.set(withSpring(1, LIFT_SPRING));
    },
    onUpdate: event => {
      "worklet";
      const start = grab.get();
      if (!start || exitEdge.get()) return;
      const last = lastMove.get();
      if (last.x === event.absoluteX && last.y === event.absoluteY) return;
      const time = performance.now();
      const dt = time - last.time;
      lastMove.set({
        time, x: event.absoluteX, y: event.absoluteY,
        vx: sampleVelocity(event.velocityX, event.absoluteX - last.x, dt, last.vx),
        vy: sampleVelocity(event.velocityY, event.absoluteY - last.y, dt, last.vy),
      });
      x.set(start.x + event.absoluteX - start.fingerX);
      y.set(start.y + (event.absoluteY - start.fingerY) * VERTICAL_TRAVEL);
    },
    onDeactivate: event => {
      "worklet";
      const start = grab.get();
      if (!start || exitEdge.get()) return;
      grab.set(null);
      // A finger that stopped before lifting has no throw velocity.
      const last = lastMove.get();
      const carry = clamp((100 - (performance.now() - last.time)) / 65, 0, 1);
      const vx = clamp(NATIVE_VELOCITY && event.velocityX || last.vx, -4000, 4000) * carry;
      const vy = clamp(NATIVE_VELOCITY && event.velocityY || last.vy, -4000, 4000) * carry;
      const dx = event.absoluteX - start.fingerX;
      const dy = event.absoluteY - start.fingerY;
      const projected = dx + vx * 0.12;
      const voteDistance = width * VOTE_FRACTION;
      const flickDistance = Math.min(voteDistance, Math.max(60, width * 0.16));
      if (!event.canceled && Math.abs(dx) > Math.abs(dy) &&
          Math.abs(dx) >= flickDistance && Math.sign(dx) * projected >= voteDistance) {
        const direction = dx > 0 ? "like" : "pass";
        scheduleOnRN(recordGestureVote, direction);
        throwCard(direction, vx, vy);
      } else {
        settle(event.canceled ? 0 : vx, event.canceled ? 0 : vy);
      }
    },
    onFinalize: () => {
      "worklet";
      // A tap or a cancelled gesture can finish before the pan activates.
      if (grab.get() && !exitEdge.get()) {
        grab.set(null);
        settle();
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const depth = isTop || reduceMotion ? 0 : 1 - reveal.get();
    const raised = isTop && !reduceMotion ? lift.get() : 0;
    const tilt = isTop && !reduceMotion ? clamp(fraction.get() * 25, -MAX_TILT, MAX_TILT) : 0;
    return {
      transform: [
        { translateX: isTop ? x.get() : 0 },
        { translateY: isTop ? y.get() : 10 * depth },
        { rotate: `${tilt}deg` },
        { scale: 1 - 0.05 * depth + 0.015 * raised },
      ],
    };
  });
  const likeStyle = useAnimatedStyle(() => ({ opacity: clamp(fraction.get() / VOTE_FRACTION, 0, 1) }));
  const passStyle = useAnimatedStyle(() => ({ opacity: clamp(-fraction.get() / VOTE_FRACTION, 0, 1) }));
  function swipe(direction: SwipeVote) {
    if (!isTop || !width || recorded.current || exitEdge.get()) return;
    // A button already runs on the React thread. An immediate invite must
    // include this vote even if the first animation frame is still pending.
    recorded.current = vote(direction);
    if (recorded.current) scheduleOnUI(throwCard, direction, 0, 0);
  }
  return { pan, cardStyle, likeStyle, passStyle, swipe };
}
