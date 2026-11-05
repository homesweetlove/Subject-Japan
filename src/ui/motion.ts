import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/**
 * Shared motion rules. Movement only answers a person's action (press,
 * select, open); nothing loops or plays on its own. When the OS asks for
 * reduced motion, every animation below collapses to an instant change.
 */
export const motion = {
  /** Native driver is unavailable on react-native-web. */
  native: Platform.OS !== "web",
  press: { speed: 40, bounciness: 0 },
  release: { speed: 22, bounciness: 6 },
  settle: { speed: 18, bounciness: 4 },
  enterMs: 220,
};

let reduced = false;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function start() {
  if (started) return;
  started = true;
  AccessibilityInfo.isReduceMotionEnabled()
    .then((value) => {
      reduced = value;
      emit();
    })
    .catch(() => {});
  AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
    reduced = value;
    emit();
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => reduced;

/** One app-wide subscription instead of one per pressable. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
