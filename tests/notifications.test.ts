import { beforeEach, describe, expect, it, vi } from "vitest";

const os = vi.hoisted(() => ({
  pending: new Map<string, unknown>(),
  granted: true,
  schedule: vi.fn(),
  cancel: vi.fn(),
  last: null as any,
  receive: null as any,
}));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getAllScheduledNotificationsAsync: async () =>
    [...os.pending.keys()].map((identifier) => ({ identifier })),
  getPermissionsAsync: async () => ({ granted: os.granted }),
  scheduleNotificationAsync: os.schedule,
  cancelScheduledNotificationAsync: os.cancel,
  SchedulableTriggerInputTypes: { DATE: "date" },
  addNotificationResponseReceivedListener: (fn: any) => {
    os.receive = fn;
    return { remove: vi.fn() };
  },
  getLastNotificationResponseAsync: async () => os.last,
}));
import { notifier } from "../src/features/today/notifications";
import type { PlannedNotification } from "../src/features/today/model";
const plan = (key: string): PlannedNotification[] => [
  {
    key,
    at: Date.now() + 60000,
    title: "일정",
    body: "일본 시각",
    target: "itinerary",
  },
];

beforeEach(() => {
  os.pending.clear();
  os.granted = true;
  os.last = null;
  os.schedule.mockReset().mockImplementation(async (n) => {
    os.pending.set(n.identifier, n);
  });
  os.cancel.mockReset().mockImplementation(async (id) => {
    os.pending.delete(id);
  });
});

describe("local notification reconciliation", () => {
  it("serializes an in-flight save followed by a reset without leaving stale alerts", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((r) => {
      release = r;
    });
    os.pending.set("unrelated", {});
    os.schedule.mockImplementationOnce(async (n) => {
      await blocked;
      os.pending.set(n.identifier, n);
    });
    const save = notifier.sync(plan("first"));
    const reset = notifier.sync([]);
    release();
    await Promise.all([save, reset]);
    expect([...os.pending.keys()]).toEqual(["unrelated"]);
  });

  it("preserves prior alerts if replacement fails, then recovers on the next sync", async () => {
    os.pending.set("subject-japan:old", {});
    os.schedule.mockRejectedValueOnce(new Error("OS failure"));
    await expect(notifier.sync(plan("new"))).rejects.toThrow("OS failure");
    expect(os.pending.has("subject-japan:old")).toBe(true);
    await notifier.sync(plan("new"));
    expect([...os.pending.keys()]).toEqual(["subject-japan:new"]);
  });

  it("removes own alerts after permission revocation and ignores elapsed dates", async () => {
    os.pending.set("subject-japan:old", {});
    os.granted = false;
    await notifier.sync(plan("new"));
    expect(os.pending.size).toBe(0);
    os.granted = true;
    await notifier.sync(
      plan("expired").map((n) => ({ ...n, at: Date.now() - 1 })),
    );
    expect(os.schedule).not.toHaveBeenCalled();
  });

  it("opens cold-start responses only once and ignores responses after unmount", async () => {
    os.last = {
      notification: {
        date: 100,
        request: {
          identifier: "subject-japan:trip:1",
          content: { data: { target: "itinerary" } },
        },
      },
    };
    const listener = vi.fn();
    const dispose = notifier.onOpen(listener);
    await Promise.resolve();
    os.receive(os.last);
    expect(listener).toHaveBeenCalledExactlyOnceWith("itinerary");
    dispose();
    os.receive({
      ...os.last,
      notification: { ...os.last.notification, date: 200 },
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
