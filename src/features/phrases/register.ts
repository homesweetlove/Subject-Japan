export type Register = "casual" | "polite" | "formal";
/** Authored phrase alternatives. Never apply suffix substitutions to arbitrary translations. */
export const registers: Record<string, { casual: string; formal: string }> = {
  card: {
    casual: "カードで払える？",
    formal: "カードでお支払いすることは可能でしょうか？",
  },
  try: {
    casual: "試着してもいい？",
    formal: "試着させていただいてもよろしいでしょうか？",
  },
  bag: {
    casual: "袋を一枚もらえる？",
    formal: "袋を一枚いただけますでしょうか？",
  },
  top: {
    casual: "この商品の{size}サイズはある？",
    formal: "こちらの商品の{size}サイズはございますか？",
  },
  bottom: {
    casual: "このパンツの{size}サイズはある？",
    formal: "こちらのパンツの{size}サイズはございますか？",
  },
  shoe: {
    casual: "この靴の{size}サイズはある？",
    formal: "こちらの靴の{size}サイズはございますか？",
  },
  larger: {
    casual: "もうワンサイズ大きいのはある？",
    formal: "もうワンサイズ大きいものはございますでしょうか？",
  },
  stock: { casual: "ほかの色もある？", formal: "ほかのお色もございますか？" },
  tax: {
    casual: "免税にできる？",
    formal: "免税のお手続きをお願いできますでしょうか？",
  },
  guest: {
    casual: "外国人旅行者向けの割引はある？",
    formal: "外国人旅行者向けの割引はございますでしょうか？",
  },
  counter: {
    casual: "免税カウンターはどこ？",
    formal: "免税カウンターの場所を教えていただけますでしょうか？",
  },
  ingredients: {
    casual: "この料理には何が入ってる？",
    formal: "こちらのお料理には何が入っているか教えていただけますでしょうか？",
  },
  order: {
    casual: "これを一つちょうだい。",
    formal: "こちらを一ついただけますでしょうか。",
  },
  bill: {
    casual: "お会計、お願い。",
    formal: "お会計をお願いできますでしょうか。",
  },
  checkin: {
    casual: "チェックインしたいんだけど。",
    formal: "チェックインをお願いできますでしょうか。",
  },
  luggage: {
    casual: "荷物を預かってもらえる？",
    formal: "荷物を預かっていただくことは可能でしょうか？",
  },
  reservation: {
    casual: "予約番号はこれなんだけど、予約が確認できないんだ。",
    formal:
      "予約番号はこちらですが、予約が確認できておりません。ご確認いただけますでしょうか。",
  },
  reserved: { casual: "予約してるよ。", formal: "予約をしております。" },
  station: {
    casual: "一番近い駅はどこ？",
    formal: "一番近い駅を教えていただけますでしょうか？",
  },
  charge: {
    casual: "交通系ICカードにチャージしたいんだけど。",
    formal: "交通系ICカードへのチャージをお願いできますでしょうか。",
  },
  help: { casual: "助けて！", formal: "助けていただけませんか。" },
  ambulance: {
    casual: "救急車を呼んで！",
    formal: "救急車を呼んでいただけますか。",
  },
  hospital: { casual: "病院に行きたい。", formal: "病院に伺いたいのですが。" },
};
