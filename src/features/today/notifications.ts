import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { PlannedNotification } from "./model";

/** Identifier prefix so sync never touches notifications from other sources. */
const PREFIX = "subject-japan:";
const CHANNEL = "trip-alerts";

export type PermissionState = "granted" | "denied" | "undetermined";

let configured = false;
// OS scheduling is asynchronous: a slow older sync must not restore reminders
// after a newer save, restore or reset has removed them.
let syncQueue: Promise<void> = Promise.resolve();
function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const notifier = {
  available: true,
  async permission(): Promise<PermissionState> {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? "granted" : p.canAskAgain ? "undetermined" : "denied";
  },
  async request(): Promise<PermissionState> {
    configure();
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "막차·일정 알림",
        importance: Notifications.AndroidImportance.HIGH,
      });
    const p = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return p.granted ? "granted" : p.canAskAgain ? "undetermined" : "denied";
  },
  /** Replaces this app's pending notifications with the given plan. */
  sync(plan: PlannedNotification[]): Promise<void> {
    const next = syncQueue.catch(() => {}).then(() => syncPlan(plan));
    syncQueue = next;
    return next;
  },
  /** Handles both an already-running app and a notification that launched it. */
  onOpen(listener: (target: PlannedNotification["target"]) => void) {
    let active = true;
    const seen = new Set<string>();
    const receive = (r: Notifications.NotificationResponse | null) => {
      if (!active || !r) return;
      const request = r.notification.request;
      const key = `${request.identifier}:${r.notification.date}`;
      const target = request.content.data?.target;
      if (
        request.identifier.startsWith(PREFIX) &&
        !seen.has(key) &&
        (target === "airport" ||
          target === "itinerary" ||
          target === "taxfree")
      ) {
        seen.add(key);
        listener(target);
      }
    };
    const sub = Notifications.addNotificationResponseReceivedListener(receive);
    void Notifications.getLastNotificationResponseAsync()
      .then(receive)
      .catch(() => {});
    return () => {
      active = false;
      sub.remove();
    };
  },
};

async function syncPlan(plan: PlannedNotification[]) {
  configure();
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const granted =
    plan.length > 0 && (await Notifications.getPermissionsAsync()).granted;
  const upcoming = granted ? plan.filter((n) => n.at > Date.now()) : [];
  const wanted = new Set(upcoming.map((n) => `${PREFIX}${n.key}`));
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "막차·일정 알림",
      importance: Notifications.AndroidImportance.HIGH,
    });
  // Reuse stable identifiers. Do not erase the previous schedule before a
  // replacement has been accepted by the OS.
  for (const n of upcoming)
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${n.key}`,
      content: {
        title: n.title,
        body: n.body,
        data: { target: n.target },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.at,
        channelId: CHANNEL,
      },
    });
  await Promise.all(
    pending
      .filter(
        (n) => n.identifier.startsWith(PREFIX) && !wanted.has(n.identifier),
      )
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
