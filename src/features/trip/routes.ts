/**
 * Hand-offs to apps that already do routing and ride booking well. The
 * destination text the user typed is the only thing passed on; the app
 * never sends the device location itself (Uber reads its own GPS).
 */
export type TravelMode = "transit" | "walking";

/** Google Maps URLs (no API key): opens the app when installed. */
export function googleDirectionsUrl(destination: string, mode: TravelMode) {
  const params = new URLSearchParams({
    api: "1",
    destination: destination.trim(),
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Uber universal link: opens Uber with the drop-off filled in and pickup at
 * the rider's current location, where Uber shows its own fare estimate
 * before anything is booked. Without the app it opens Uber's mobile site.
 */
export function uberUrl(destination: string) {
  const place = encodeURIComponent(destination.trim());
  return (
    "https://m.uber.com/ul/?action=setPickup&pickup=my_location" +
    `&dropoff%5Bformatted_address%5D=${place}` +
    `&dropoff%5Bnickname%5D=${place}`
  );
}

/** Taxi drivers in Japan expect the address or place name in Japanese. */
export const taxiPhrase = {
  japanese: (destination: string) =>
    `${destination.trim()}までお願いします。`,
  reading: "~마데 오네가이시마스.",
  korean: "여기까지 가 주세요.",
};

export interface RailInfoLink {
  label: string;
  area: string;
  url: string;
}

/**
 * Official or long-standing live service status pages. Yahoo! 乗換案内
 * gathers every major operator in an area on one page.
 */
export const railInfoLinks: RailInfoLink[] = [
  {
    label: "간토(도쿄·요코하마) 전체 노선 운행 정보",
    area: "간토",
    url: "https://transit.yahoo.co.jp/traininfo/area/4/",
  },
  {
    label: "간사이(오사카·교토·고베) 전체 노선 운행 정보",
    area: "간사이",
    url: "https://transit.yahoo.co.jp/traininfo/area/6/",
  },
  {
    label: "JR 서일본 운행 정보 (페이지에서 한국어 선택)",
    area: "간사이",
    url: "https://www.westjr.co.jp/global/en/travel_support/traininfo.html",
  },
];
