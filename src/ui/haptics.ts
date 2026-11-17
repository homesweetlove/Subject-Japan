import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// One small tap per user action, always next to a visible change.
// Silent on web and wherever the device has no vibration motor.
function run(task: () => Promise<void>) {
  if (Platform.OS === "web") return;
  task().catch(() => undefined);
}

export const haptic = {
  tick: () => run(() => Haptics.selectionAsync()),
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  done: () =>
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),
};
