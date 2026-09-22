import { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import {
  calculatePayment,
  fetchRate,
  type ExchangeRate,
  type PaymentInput,
} from "./calculator";
export function PayScreen({
  rate,
  onRate,
}: {
  rate: ExchangeRate | null;
  onRate: (r: ExchangeRate) => Promise<void>;
}) {
  const [price, setPrice] = useState("");
  const [rateText, setRateText] = useState(
    rate ? String(rate.krwPer100Jpy) : "",
  );
  const [discount, setDiscount] = useState("0"),
    [coupon, setCoupon] = useState("0");
  const [refundFee, setRefundFee] = useState("0"),
    [cardFee, setCardFee] = useState("0"),
    [cashback, setCashback] = useState("0"),
    [cap, setCap] = useState("");
  const [includesTax, setIncludesTax] = useState(true),
    [taxRate, setTaxRate] = useState(10),
    [stack, setStack] = useState(false);
  const [taxMode, setTaxMode] = useState<PaymentInput["taxMode"]>("none");
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  let result: ReturnType<typeof calculatePayment> | null = null,
    error = "";
  try {
    if (price)
      result = calculatePayment({
        price: Number(price),
        krwPer100Jpy: Number(rateText),
        includesTax,
        taxRate,
        discount: Number(discount),
        coupon: Number(coupon),
        stackConfirmed: stack,
        taxMode,
        refundFee: Number(refundFee),
        cardFee: Number(cardFee),
        cashback: Number(cashback),
        cashbackCap: cap ? Number(cap) : null,
      });
  } catch (e) {
    error = (e as Error).message;
  }
  const saveManual = async () => {
    try {
      const n = Number(rateText);
      if (!Number.isFinite(n) || n <= 0 || n > 100000)
        throw new Error("100엔당 원화 환율을 확인해 주세요.");
      await onRate({
        krwPer100Jpy: n,
        date: new Date().toISOString().slice(0, 10),
        fetchedAt: Date.now(),
        source: "manual",
      });
      setNotice("환율을 기기에 저장했어요.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const refresh = async () => {
    setBusy(true);
    setNotice("");
    const current = new AbortController();
    controller.current = current;
    const timeout = setTimeout(() => current.abort(), 12000);
    try {
      const value = await fetchRate(current.signal);
      if (current.signal.aborted) return;
      await onRate(value);
      setRateText(String(Math.round(value.krwPer100Jpy * 100) / 100));
      setNotice(
        "참고 환율을 갱신했어요. 카드사 실제 적용 환율은 다를 수 있어요.",
      );
    } catch {
      setNotice(
        "환율을 가져오지 못했어요. 저장된 환율이나 직접 입력을 이용해 주세요.",
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <Label size={30} weight="700">
        결제 전, 한 번 더
      </Label>
      <Label muted>할인부터 환급·캐시백까지 예상 실지출을 계산해요.</Label>
      <Card>
        <Field
          label="100엔당 원화 환율"
          value={rateText}
          onChange={setRateText}
          numeric
        />
        <Label size={12} muted>
          {rate
            ? `${rate.source === "manual" ? "직접 입력" : "Frankfurter 참고 환율"} · ${rate.date}${Date.now() - rate.fetchedAt > 86400000 ? " · 오래된 환율, 갱신 권장" : ""}`
            : "환율을 직접 입력하거나 가져와 주세요."}
        </Label>
        <Button label="환율 저장" onPress={() => void saveManual()} />
        <Button
          label="최신 참고 환율 가져오기"
          busy={busy}
          onPress={() => void refresh()}
        />
      </Card>
      <Card>
        <Field
          label="상품 금액 (엔)"
          value={price}
          onChange={setPrice}
          numeric
        />
        <View style={styles.between}>
          {[true, false].map((v) => (
            <Choice
              key={String(v)}
              label={v ? "세금 포함 가격" : "세금 별도 가격"}
              selected={includesTax === v}
              onPress={() => setIncludesTax(v)}
            />
          ))}
        </View>
        <View style={styles.between}>
          {[10, 8, 0].map((v) => (
            <Choice
              key={v}
              label={`소비세 ${v}%`}
              selected={taxRate === v}
              onPress={() => setTaxRate(v)}
            />
          ))}
        </View>
        <Field
          label="게스트·매장 할인 (%)"
          value={discount}
          onChange={setDiscount}
          numeric
        />
        <Field
          label="추가 쿠폰 할인 (%)"
          value={coupon}
          onChange={setCoupon}
          numeric
        />
        <Choice
          label="두 할인 중복 사용 가능 확인"
          checkbox
          selected={stack}
          onPress={() => setStack(!stack)}
        />
        <Label size={12} muted>
          첫 할인 후 남은 금액에 두 번째 할인을 적용해요. 서로 다른 세율 상품은
          나누어 계산하세요.
        </Label>
      </Card>
      <Card>
        <Label weight="700">면세와 결제 조건</Label>
        <View style={{ gap: 8 }}>
          {(["none", "immediate", "refund"] as const).map((v, i) => (
            <Choice
              key={v}
              label={
                [
                  "면세 없음",
                  "결제 시 면세·즉시 환급",
                  "세금 결제 후 나중에 환급",
                ][i]
              }
              selected={taxMode === v}
              onPress={() => setTaxMode(v)}
            />
          ))}
        </View>
        <Label muted size={12}>
          면세 자격·최소 구매액·대상 상품을 매장에서 확인한 경우만 선택하세요.
          2026년 11월 1일부터 일본 면세는 출국 확인 후 환급 방식으로 바뀝니다.
        </Label>
        <Button
          label="일본 국세청 면세 제도 안내"
          onPress={() =>
            void Linking.openURL(
              "https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002.htm",
            ).catch(() => setNotice("공식 페이지를 열지 못했어요."))
          }
        />
        <Field
          label="환급 세액에서 차감되는 수수료 (%)"
          value={refundFee}
          onChange={setRefundFee}
          numeric
        />
        <Field
          label="카드 해외 결제 수수료 (%)"
          value={cardFee}
          onChange={setCardFee}
          numeric
        />
        <Field
          label="카드 캐시백 (%)"
          value={cashback}
          onChange={setCashback}
          numeric
        />
        <Field
          label="캐시백 한도 (엔, 비우면 제한 없음)"
          value={cap}
          onChange={setCap}
          numeric
        />
      </Card>
      {!!error && <Label>{error}</Label>}
      {result && (
        <Card>
          <Label weight="700">예상 최종 부담액</Label>
          <Label size={32} weight="700">
            ₩{result.krw.toLocaleString()}
          </Label>
          <Label>¥{result.final.toLocaleString()} 상당</Label>
          <Label size={13}>
            매장 결제 ¥{result.paid.toLocaleString()} + 카드 수수료 ¥
            {result.fee.toLocaleString()}
          </Label>
          <Label size={13}>
            추후 환급 −¥{result.laterRefund.toLocaleString()} · 캐시백 −¥
            {result.cashback.toLocaleString()}
          </Label>
          <Label size={12} muted>
            참고 추정치예요. 매장 단수 처리·고정 수수료·환급 환율·카드사 적립
            제외 조건에 따라 달라집니다. 캐시백은 환급 후 상품 금액 기준으로
            계산해요.
          </Label>
        </Card>
      )}
      {!!notice && <Label>{notice}</Label>}
    </View>
  );
}
