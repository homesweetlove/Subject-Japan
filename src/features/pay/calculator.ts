export interface ExchangeRate {
  krwPer100Jpy: number;
  date: string;
  fetchedAt: number;
  source: "manual" | "Frankfurter";
}
export interface PaymentInput {
  price: number;
  includesTax: boolean;
  taxRate: number;
  discount: number;
  coupon: number;
  stackConfirmed: boolean;
  taxMode: "none" | "immediate" | "refund";
  refundFee: number;
  cardFee: number;
  cashback: number;
  cashbackCap: number | null;
  krwPer100Jpy: number;
}
export function calculatePayment(i: PaymentInput) {
  const percentages = [
    i.discount,
    i.coupon,
    i.refundFee,
    i.cardFee,
    i.cashback,
  ];
  if (
    !Number.isFinite(i.price) ||
    i.price <= 0 ||
    i.price > 100000000 ||
    ![0, 8, 10].includes(i.taxRate) ||
    percentages.some((n) => !Number.isFinite(n) || n < 0 || n > 100) ||
    !Number.isFinite(i.krwPer100Jpy) ||
    i.krwPer100Jpy <= 0 ||
    i.krwPer100Jpy > 100000 ||
    (i.cashbackCap !== null &&
      (!Number.isFinite(i.cashbackCap) ||
        i.cashbackCap < 0 ||
        i.cashbackCap > 100000000))
  )
    throw new Error(
      "금액·환율은 양수, 할인율·수수료는 0~100%로 입력해 주세요.",
    );
  if (i.discount > 0 && i.coupon > 0 && !i.stackConfirmed)
    throw new Error("두 할인을 함께 쓸 수 있는지 확인해 주세요.");
  if (!["none", "immediate", "refund"].includes(i.taxMode))
    throw new Error("면세 방식을 확인해 주세요.");
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const gross = round(i.price * (i.includesTax ? 1 : 1 + i.taxRate / 100));
  const discounted = round(
    gross * (1 - i.discount / 100) * (1 - i.coupon / 100),
  );
  const tax = round(discounted - discounted / (1 + i.taxRate / 100));
  const refund =
    i.taxMode === "none" ? 0 : round(tax * (1 - i.refundFee / 100));
  const paid = round(discounted - (i.taxMode === "immediate" ? refund : 0));
  const laterRefund = i.taxMode === "refund" ? refund : 0;
  const fee = round((paid * i.cardFee) / 100);
  // Cashback is based on retained purchase cost, not tax subsequently refunded.
  const cashback = round(
    Math.min(
      ((paid - laterRefund) * i.cashback) / 100,
      i.cashbackCap ?? Infinity,
    ),
  );
  const final = round(paid + fee - laterRefund - cashback);
  return {
    gross,
    discounted,
    tax,
    refund,
    paid,
    laterRefund,
    fee,
    cashback,
    final,
    krw: Math.round((final * i.krwPer100Jpy) / 100),
  };
}
export function validRate(v: unknown): v is ExchangeRate {
  const r = v as ExchangeRate;
  return (
    !!r &&
    Number.isFinite(r.krwPer100Jpy) &&
    r.krwPer100Jpy > 0 &&
    r.krwPer100Jpy <= 100000 &&
    typeof r.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    Number.isFinite(r.fetchedAt) &&
    ["manual", "Frankfurter"].includes(r.source)
  );
}
export async function fetchRate(signal?: AbortSignal): Promise<ExchangeRate> {
  const response = await fetch(
    "https://api.frankfurter.dev/v2/rates?base=JPY&quotes=KRW",
    { signal },
  );
  if (!response.ok)
    throw new Error(
      "환율 제공 서버에 연결하지 못했어요. 직접 입력할 수 있어요.",
    );
  const json = await response.json();
  const rate = Array.isArray(json)
    ? json.find((r) => r.base === "JPY" && r.quote === "KRW")
    : null;
  const value: ExchangeRate = {
    krwPer100Jpy: rate?.rate * 100,
    date: rate?.date,
    fetchedAt: Date.now(),
    source: "Frankfurter",
  };
  if (!validRate(value)) throw new Error("환율 응답을 확인할 수 없어요.");
  return value;
}
