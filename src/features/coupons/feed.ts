import AsyncStorage from "@react-native-async-storage/async-storage";
import { bundledFeed, parseCouponFeed, type CouponFeed } from "./catalog";

const url =
  "https://raw.githubusercontent.com/homesweetlove/Subject-Japan/main/src/features/coupons/catalog.v1.json";
const key = "subject-japan.coupon-feed.v1";
export async function cachedFeed(): Promise<CouponFeed> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const cached = parseCouponFeed(JSON.parse(raw));
      if (cached.revision > bundledFeed.revision) return cached;
    }
  } catch {
    /* The bundled catalog is always available offline. */
  }
  return bundledFeed;
}
export async function refreshFeed(signal: AbortSignal): Promise<CouponFeed> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("쿠폰 목록을 받을 수 없어요.");
  const feed = parseCouponFeed(await response.json());
  const current = await cachedFeed();
  if (feed.revision <= current.revision) return current;
  await AsyncStorage.setItem(key, JSON.stringify(feed));
  return feed;
}
