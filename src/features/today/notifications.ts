import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { PlannedNotification } from "./model";

/** Identifier prefix so sync never touches notifications from other sources. */
const PREFIX = "subject-japan:";
const CHANNEL = "trip-alerts";

export type PermissionState = "granted" | "denied" | "undetermined";

let configured = false;
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
  async sync(plan: PlannedNotification[]) {
    configure();
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter((n) => n.identifier.startsWith(PREFIX))
        .map((n) =>
          Notifications.cancelScheduledNotificationAsync(n.identifier),
        ),
    );
    if (!plan.length) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "막차·일정 알림",
        importance: Notifications.AndroidImportance.HIGH,
      });
    for (const n of plan)
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
  },
  /** Calls back with the tapped notification's target section. */
  onOpen(listener: (target: PlannedNotification["target"]) => void) {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const target = r.notification.request.content.data?.target;
      if (
        r.notification.request.identifier.startsWith(PREFIX) &&
        (target === "airport" || target === "itinerary")
      )
        listener(target);
    });
    return () => sub.remove();
  },
};
