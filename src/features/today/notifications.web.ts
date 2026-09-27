import type { PlannedNotification } from "./model";

export type PermissionState = "granted" | "denied" | "undetermined";

/** Browsers cannot schedule notifications while the page is closed. */
export const notifier = {
  available: false,
  async permission(): Promise<PermissionState> {
    return "denied";
  },
  async request(): Promise<PermissionState> {
    return "denied";
  },
  async sync(_plan: PlannedNotification[]) {},
  onOpen(_listener: (target: PlannedNotification["target"]) => void) {
    return () => {};
  },
};
