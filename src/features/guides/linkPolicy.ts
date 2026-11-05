/** Pure link allow-list, importable from tests without React Native. */
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
  "www.customs.go.jp",
  // Airport pages for tax-free kiosks and live security waiting times.
  "www.kansai-airport.or.jp",
  "tokyo-haneda.com",
  "www.narita-airport.jp",
  "www.centrair.jp",
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
