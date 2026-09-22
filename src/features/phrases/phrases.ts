import type { Language, Profile, SizeKey } from "../../domain/models";
import { registers, type Register } from "./register";

export const categories = [
  "쇼핑",
  "사이즈/재고",
  "백화점/면세",
  "식당",
  "호텔",
  "예약",
  "교통",
  "응급상황",
] as const;
export type Category = (typeof categories)[number];
export interface Phrase {
  id: string;
  category: Category;
  ko: string;
  ja: string;
  sizeKey?: SizeKey;
}
export const phrases: Phrase[] = [
  {
    id: "card",
    category: "쇼핑",
    ko: "카드로 결제할 수 있나요?",
    ja: "カードで支払えますか？",
  },
  {
    id: "try",
    category: "쇼핑",
    ko: "입어 봐도 될까요?",
    ja: "試着してもいいですか？",
  },
  {
    id: "bag",
    category: "쇼핑",
    ko: "봉투를 하나 주세요.",
    ja: "袋を一枚お願いします。",
  },
  {
    id: "top",
    category: "사이즈/재고",
    ko: "이 제품 {size} 사이즈도 있나요?",
    ja: "この商品の{size}サイズはありますか？",
    sizeKey: "top",
  },
  {
    id: "bottom",
    category: "사이즈/재고",
    ko: "이 바지 {size} 사이즈도 있나요?",
    ja: "このパンツの{size}サイズはありますか？",
    sizeKey: "bottom",
  },
  {
    id: "shoe",
    category: "사이즈/재고",
    ko: "이 신발 {size} 사이즈도 있나요?",
    ja: "この靴の{size}サイズはありますか？",
    sizeKey: "shoe",
  },
  {
    id: "larger",
    category: "사이즈/재고",
    ko: "한 치수 더 큰 제품은 없을까요?",
    ja: "もうワンサイズ大きいものはありますか？",
  },
  {
    id: "stock",
    category: "사이즈/재고",
    ko: "다른 색상도 있나요?",
    ja: "ほかの色もありますか？",
  },
  {
    id: "tax",
    category: "백화점/면세",
    ko: "면세가 가능한가요?",
    ja: "免税はできますか？",
  },
  {
    id: "guest",
    category: "백화점/면세",
    ko: "외국인 여행자 할인도 있나요?",
    ja: "外国人旅行者向けの割引はありますか？",
  },
  {
    id: "counter",
    category: "백화점/면세",
    ko: "면세 카운터는 어디인가요?",
    ja: "免税カウンターはどこですか？",
  },
  {
    id: "ingredients",
    category: "식당",
    ko: "이 메뉴에는 무엇이 들어가나요?",
    ja: "この料理には何が入っていますか？",
  },
  {
    id: "order",
    category: "식당",
    ko: "이것 하나 주세요.",
    ja: "これを一つお願いします。",
  },
  {
    id: "bill",
    category: "식당",
    ko: "계산해 주세요.",
    ja: "お会計をお願いします。",
  },
  {
    id: "checkin",
    category: "호텔",
    ko: "체크인하고 싶습니다.",
    ja: "チェックインをお願いします。",
  },
  {
    id: "luggage",
    category: "호텔",
    ko: "짐을 맡길 수 있을까요?",
    ja: "荷物を預かっていただけますか？",
  },
  {
    id: "reservation",
    category: "예약",
    ko: "예약번호가 이것인데 예약이 확인되지 않습니다.",
    ja: "予約番号はこちらですが、予約が確認できません。",
  },
  {
    id: "reserved",
    category: "예약",
    ko: "예약했습니다.",
    ja: "予約しています。",
  },
  {
    id: "station",
    category: "교통",
    ko: "가장 가까운 역은 어디인가요?",
    ja: "一番近い駅はどこですか？",
  },
  {
    id: "charge",
    category: "교통",
    ko: "교통카드를 충전하고 싶습니다.",
    ja: "交通系ICカードにチャージしたいです。",
  },
  {
    id: "help",
    category: "응급상황",
    ko: "도와주세요.",
    ja: "助けてください。",
  },
  {
    id: "ambulance",
    category: "응급상황",
    ko: "구급차를 불러 주세요.",
    ja: "救急車を呼んでください。",
  },
  {
    id: "hospital",
    category: "응급상황",
    ko: "병원에 가고 싶습니다.",
    ja: "病院に行きたいです。",
  },
];

export function resolvePhrase(
  phrase: Phrase,
  profile: Profile,
  register: Register = "polite",
): Record<Language, string> | null {
  const size = phrase.sizeKey ? profile.sizes[phrase.sizeKey].trim() : "";
  if (phrase.sizeKey && !size) return null;
  return {
    ko: phrase.ko.replace("{size}", () => size),
    ja: (register === "polite"
      ? phrase.ja
      : (registers[phrase.id]?.[register] ?? phrase.ja)
    ).replace("{size}", () => size),
  };
}

const normalize = (text: string) => text.trim().replace(/[\s。.!！?？]/g, "");
export function findPhrase(text: string, source: Language, profile: Profile) {
  return phrases
    .flatMap((p) =>
      (["polite", "casual", "formal"] as const).map((register) =>
        resolvePhrase(p, profile, register),
      ),
    )
    .find((p) => p && normalize(p[source]) === normalize(text));
}
