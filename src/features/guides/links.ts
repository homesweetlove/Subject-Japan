import { Linking } from "react-native";
import { officialHosts } from "../coupons/model";
const hosts = new Set([
  ...officialHosts,
  "www.keisei.co.jp",
  "www.haneda-tokyo-access.com",
  "www.howto-osaka.com",
  "subway.city.fukuoka.lg.jp",
  "www.jrhokkaido.co.jp",
  "www.meitetsu.co.jp",
  "ib.eplus.jp",
  "l-tike.com",
  // Japan Tourism Agency and JNTO pages on the 2026 tax-free refund method.
  "www.mlit.go.jp",
  "www.japan.travel",
]);
export function validTravelLink(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      hosts.has(u.hostname)
    );
  } catch {
    return false;
  }
}
export async function openTravelLink(url: string) {
  if (!validTravelLink(url)) throw new Error("확인된 공식 링크가 아니에요.");
  try {
    await Linking.openURL(url);
  } catch {
    throw new Error(
      "페이지를 열지 못했어요. 네트워크와 브라우저를 확인해 주세요.",
    );
  }
}
