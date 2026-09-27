export interface DiningPhrase {
  id: string;
  category: "order" | "taste" | "pay" | "request";
  titleKo: string;
  japanese: string;
  reading: string;
  detail?: string;
}

export const diningPhrases: DiningPhrase[] = [
  {
    id: "dp-1",
    category: "order",
    titleKo: "와사비 빼주세요",
    japanese: "わさび抜きでお願いします。",
    reading: "와사비누키데 오네가이시마스.",
    detail: "초밥, 덮밥류 주문 시 와사비를 넣지 말아달라고 할 때",
  },
  {
    id: "dp-2",
    category: "order",
    titleKo: "추천 메뉴는 무엇인가요?",
    japanese: "おすすめは何ですか？",
    reading: "오스스메와 난데스카?",
    detail: "가게의 대표 메뉴나 시그니처를 묻고 싶을 때",
  },
  {
    id: "dp-3",
    category: "taste",
    titleKo: "조금 덜 짜게 해줄 수 있나요?",
    japanese: "少し薄味にしていただけますか？",
    reading: "스코시 우스아지니 시테 이타다케마스카?",
    detail: "일본 라멘이나 국물 요리가 너무 짤 것 같을 때",
  },
  {
    id: "dp-4",
    category: "request",
    titleKo: "찬물(얼음물) 부탁드립니다",
    japanese: "お冷をお願いします。",
    reading: "오히야오 오네가이시마스.",
    detail: "식당에서 얼음물을 추가로 요청할 때",
  },
  {
    id: "dp-5",
    category: "request",
    titleKo: "따뜻한 차 부탁드립니다",
    japanese: "温かいお茶をお願いします。",
    reading: "아타타카이 오차오 오네가이시마스.",
    detail: "초밥집이나 일식당에서 따뜻한 녹차(아가리)를 원할 때",
  },
  {
    id: "dp-6",
    category: "pay",
    titleKo: "계산서 부탁드립니다",
    japanese: "お会計をお願いします。",
    reading: "오카이케이오 오네가이시마스.",
    detail: "식사를 마치고 자리 또는 카운터에서 계산할 때",
  },
  {
    id: "dp-7",
    category: "pay",
    titleKo: "따로따로 계산할 수 있나요?",
    japanese: "お会計は別々にできますか？",
    reading: "오카이케이와 베츠베츠니 데키마스카?",
    detail: "각자 결제하고 싶을 때 (바쁜 가게에서는 거절될 수 있음)",
  },
  {
    id: "dp-8",
    category: "order",
    titleKo: "이것과 같은 것으로 하나 더 주세요",
    japanese: "これと同じものをもう一つください。",
    reading: "코레토 오나지 모노오 모-히토츠 쿠다사이.",
    detail: "먹던 음식을 추가 주문할 때",
  },
];

export interface AllergenItem {
  id: string;
  nameKo: string;
  nameJa: string;
  reading: string;
}

export const allergenItems: AllergenItem[] = [
  {
    id: "al-shrimp",
    nameKo: "새우 (갑각류)",
    nameJa: "エビ (甲殻類)",
    reading: "에비",
  },
  { id: "al-crab", nameKo: "게", nameJa: "カニ", reading: "카니" },
  {
    id: "al-soba",
    nameKo: "메밀 (소바)",
    nameJa: "そば (蕎麦)",
    reading: "소바",
  },
  {
    id: "al-egg",
    nameKo: "달걀 (계란)",
    nameJa: "卵 (たまご)",
    reading: "타마고",
  },
  {
    id: "al-milk",
    nameKo: "우유 (유제품)",
    nameJa: "乳製品 (牛乳)",
    reading: "규-뉴-",
  },
  {
    id: "al-peanut",
    nameKo: "땅콩 (견과류)",
    nameJa: "ピーナッツ (落花生)",
    reading: "피-낫츠",
  },
  { id: "al-pork", nameKo: "돼지고기", nameJa: "豚肉", reading: "부타니쿠" },
  { id: "al-beef", nameKo: "소고기", nameJa: "牛肉", reading: "규-니쿠" },
  {
    id: "al-coriander",
    nameKo: "고수 (샹차이)",
    nameJa: "パクチー",
    reading: "파쿠치-",
  },
  { id: "al-cucumber", nameKo: "오이", nameJa: "きゅうり", reading: "큐-리" },
];

export function buildAllergenSentence(selectedItems: AllergenItem[]): {
  japanese: string;
  reading: string;
  korean: string;
} {
  if (selectedItems.length === 0) {
    return {
      japanese: "アレルギーはありません。",
      reading: "아레루기-와 아리마센.",
      korean: "특별한 음식 알레르기는 없습니다.",
    };
  }
  const jaList = selectedItems.map((i) => i.nameJa).join("、");
  const koList = selectedItems.map((i) => i.nameKo).join(", ");
  return {
    japanese: `私は【${jaList}】のアレルギーがあります。この料理に入っていますか？抜いていただくことはできますか？`,
    reading: `와타시와 【${selectedItems.map((i) => i.reading).join(", ")}】노 아레루기-가 아리마스. 코노 료-리니 하잇테 이마스카? 누이테 이타다쿠 코토와 데키마스카?`,
    korean: `저는 【${koList}】 알레르기가 있습니다. 이 요리에 들어가 있나요? 빼주실 수 있나요?`,
  };
}

export interface OtoshiInfo {
  personCount: number;
  perPersonYen: number;
  totalYen: number;
  totalKrw: number;
}

export function calculateOtoshi(
  personCount: number,
  perPersonYen = 400,
  krwPer100Jpy = 900,
): OtoshiInfo {
  const count = Math.max(1, Math.min(50, Math.floor(personCount || 1)));
  const cost = Math.max(0, Math.min(5000, Math.floor(perPersonYen || 0)));
  const totalYen = count * cost;
  const totalKrw = Math.round((totalYen * krwPer100Jpy) / 100);
  return {
    personCount: count,
    perPersonYen: cost,
    totalYen,
    totalKrw,
  };
}

export interface RamenCustomization {
  noodle: "katame" | "futsu" | "yawarakame";
  broth: "kotteri" | "futsu" | "assari";
  garlic: "none" | "little" | "standard" | "extra";
}

export function buildRamenRequest(opt: RamenCustomization): {
  japanese: string;
  reading: string;
} {
  const noodleJa =
    opt.noodle === "katame"
      ? "麺硬め(めんかため)"
      : opt.noodle === "yawarakame"
        ? "麺柔らかめ(めんやわらかめ)"
        : "麺普通(めんふつう)";
  const brothJa =
    opt.broth === "kotteri"
      ? "味濃いめ・こってり"
      : opt.broth === "assari"
        ? "味薄め・あっさり"
        : "味普通";
  const garlicJa =
    opt.garlic === "none"
      ? "ニンニクなし"
      : opt.garlic === "little"
        ? "ニンニク少なめ"
        : opt.garlic === "extra"
          ? "ニンニクマシマシ"
          : "ニンニク普通";

  return {
    japanese: `${noodleJa}、${brothJa}、${garlicJa}でお願いします。`,
    reading: "면, 국물 진하기, 마늘 양을 이렇게 부탁드립니다.",
  };
}
