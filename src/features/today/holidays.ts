/**
 * Japanese national holidays (国民の祝日 and substitute days) as published
 * by the Cabinet Office for 2026 and 2027 (2027 announced 2026-02-02).
 * Shops, sights and trains are busier; banks and some offices close.
 */
const holidays: Record<string, string> = {
  "2026-01-01": "새해 첫날 (元日)",
  "2026-01-12": "성인의 날 (成人の日)",
  "2026-02-11": "건국기념일 (建国記念の日)",
  "2026-02-23": "천황 탄생일 (天皇誕生日)",
  "2026-03-20": "춘분 (春分の日)",
  "2026-04-29": "쇼와의 날 (昭和の日)",
  "2026-05-03": "헌법기념일 (憲法記念日)",
  "2026-05-04": "녹색의 날 (みどりの日)",
  "2026-05-05": "어린이날 (こどもの日)",
  "2026-05-06": "대체 휴일 (休日)",
  "2026-07-20": "바다의 날 (海の日)",
  "2026-08-11": "산의 날 (山の日)",
  "2026-09-21": "경로의 날 (敬老の日)",
  "2026-09-22": "국민의 휴일 (国民の休日)",
  "2026-09-23": "추분 (秋分の日)",
  "2026-10-12": "스포츠의 날 (スポーツの日)",
  "2026-11-03": "문화의 날 (文化の日)",
  "2026-11-23": "근로감사의 날 (勤労感謝の日)",
  "2027-01-01": "새해 첫날 (元日)",
  "2027-01-11": "성인의 날 (成人の日)",
  "2027-02-11": "건국기념일 (建国記念の日)",
  "2027-02-23": "천황 탄생일 (天皇誕生日)",
  "2027-03-21": "춘분 (春分の日)",
  "2027-03-22": "대체 휴일 (休日)",
  "2027-04-29": "쇼와의 날 (昭和の日)",
  "2027-05-03": "헌법기념일 (憲法記念日)",
  "2027-05-04": "녹색의 날 (みどりの日)",
  "2027-05-05": "어린이날 (こどもの日)",
  "2027-07-19": "바다의 날 (海の日)",
  "2027-08-11": "산의 날 (山の日)",
  "2027-09-20": "경로의 날 (敬老の日)",
  "2027-09-23": "추분 (秋分の日)",
  "2027-10-11": "스포츠의 날 (スポーツの日)",
  "2027-11-03": "문화의 날 (文化の日)",
  "2027-11-23": "근로감사의 날 (勤労感謝の日)",
};

/** Holiday name for a Japan-time date (YYYY-MM-DD), if any. */
export function japanHoliday(date: string): string | null {
  return holidays[date] ?? null;
}

/** Only years whose holidays this list actually contains. */
export function holidaysKnownFor(date: string): boolean {
  return date.startsWith("2026-") || date.startsWith("2027-");
}

export const japanDate = (timestamp: number) =>
  new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
