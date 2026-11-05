import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

/**
 * Shared clocks. Every screen that needs "now" at the same interval reads
 * one timer instead of starting its own, and the timer stops while the app
 * is in the background, then catches up the moment it returns.
 */
interface Clock {
  now: number;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setInterval>;
  /** Stable per clock, so React never re-subscribes on re-render. */
  subscribe: (listener: () => void) => () => void;
  read: () => number;
}
const clocks = new Map<number, Clock>();
let active = AppState.currentState !== "background";
let watching = false;

function tick(clock: Clock) {
  clock.now = Date.now();
  clock.listeners.forEach((listener) => listener());
}
function start(interval: number, clock: Clock) {
  if (clock.timer || !active || !clock.listeners.size) return;
  clock.timer = setInterval(() => tick(clock), interval);
}
function stop(clock: Clock) {
  if (clock.timer) clearInterval(clock.timer);
  clock.timer = undefined;
}
function watchAppState() {
  if (watching) return;
  watching = true;
  AppState.addEventListener("change", (state) => {
    const next = state === "active";
    if (next === active) return;
    active = next;
    clocks.forEach((clock, interval) => {
      if (active) {
        tick(clock);
        start(interval, clock);
      } else stop(clock);
    });
  });
}
function clockFor(interval: number): Clock {
  const existing = clocks.get(interval);
  if (existing) return existing;
  const clock: Clock = {
    now: Date.now(),
    listeners: new Set(),
    subscribe: (listener) => {
      watchAppState();
      // An idle clock is stale; React re-reads the snapshot after subscribing.
      if (!clock.listeners.size) clock.now = Date.now();
      clock.listeners.add(listener);
      start(interval, clock);
      return () => {
        clock.listeners.delete(listener);
        if (!clock.listeners.size) stop(clock);
      };
    },
    // Must return the same value until the clock ticks (React requirement).
    read: () => clock.now,
  };
  clocks.set(interval, clock);
  return clock;
}

/** Current time, refreshed every `intervalMs` while the app is open. */
export function useNow(intervalMs: number): number {
  const clock = clockFor(intervalMs);
  // Nobody is reading this clock yet, so refreshing it cannot tear another
  // screen; it spares a newly opened screen one render with an old time.
  if (!clock.listeners.size) clock.now = Date.now();
  return useSyncExternalStore(clock.subscribe, clock.read, clock.read);
}
