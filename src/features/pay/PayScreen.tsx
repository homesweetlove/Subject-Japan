import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import {
  Button,
  Card,
  Label,
  ScreenHeader,
  SubNav,
  styles,
} from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { useTheme } from "../../ui/theme";
import {
  calculatePayment,
  fetchRate,
  formatRateAge,
  isRateStale,
  quickConversions,
  type ExchangeRate,
  type PaymentInput,
} from "./calculator";
import {
  analyzeCustoms,
  categoryLabels,
  type DutyFreeCategory,
  type DutyFreeReceipt,
  TAX_FREE_MIN_JPY,
} from "./taxFreeTracker";
import {
  atmGuides,
  calculateSmartPayment,
  calculateWarikan,
  sizeChartData,
} from "./cashUtilities";

export function PayScreen({
  rate,
  onRate,
  dutyFreeReceipts = [],
  autoRefreshRate = false,
  onSaveReceipt,
  onDeleteReceipt,
  onToggleAutoRefresh,
}: {
  rate: ExchangeRate | null;
  onRate: (r: ExchangeRate) => Promise<void>;
  dutyFreeReceipts?: DutyFreeReceipt[];
  autoRefreshRate?: boolean;
  onSaveReceipt?: (receipt: DutyFreeReceipt) => Promise<void>;
  onDeleteReceipt?: (id: string) => Promise<void>;
  onToggleAutoRefresh?: (enabled: boolean) => Promise<void>;
}) {
  const c = useTheme();
  const [tab, setTab] = useState<"calculator" | "customs" | "coins" | "atm">(
    "calculator",
  );

  // Calculator states
  const [price, setPrice] = useState("");
  const [rateText, setRateText] = useState(
    rate ? String(rate.krwPer100Jpy) : "",
  );
  const [discount, setDiscount] = useState("0");
  const [coupon, setCoupon] = useState("0");
  const [refundFee, setRefundFee] = useState("0");
  const [cardFee, setCardFee] = useState("0");
  const [cashback, setCashback] = useState("0");
  const [cap, setCap] = useState("");
  const [includesTax, setIncludesTax] = useState(true);

  // Coins & Warikan states
  const [coinPrice, setCoinPrice] = useState("1234");
  const [warikanTotal, setWarikanTotal] = useState("8500");
  const [warikanPeople, setWarikanPeople] = useState("3");

  // Size chart states
  const [sizeCategory, setSizeCategory] = useState<
    "shoes" | "women-clothing" | "men-clothing"
  >("shoes");
  const [taxRate, setTaxRate] = useState(10);
  const [stack, setStack] = useState(false);
  const [taxMode, setTaxMode] = useState<PaymentInput["taxMode"]>("none");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const rateEdited = useRef(false);

  // Duty Free Receipt Form states
  const [storeName, setStoreName] = useState("");
  const [receiptJpy, setReceiptJpy] = useState("");
  const [receiptCategory, setReceiptCategory] =
    useState<DutyFreeCategory>("consumable");
  const [receiptTaxFree, setReceiptTaxFree] = useState(true);
  const [itemCount, setItemCount] = useState("1");
  const [itemVolume, setItemVolume] = useState("700");
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);

  // Auto-refresh rate on load if stale
  useEffect(() => {
    if (autoRefreshRate && isRateStale(rate)) {
      void refresh(true);
    }
  }, []);

  const refresh = async (silent = false) => {
    if (controller.current) return;
    setBusy(true);
    if (!silent) setNotice("");
    const current = new AbortController();
    controller.current = current;
    const timeout = setTimeout(() => current.abort(), 12000);
    try {
      const value = await fetchRate(current.signal);
      if (current.signal.aborted || !alive.current) return;
      await onRate(value);
      if (current.signal.aborted || !alive.current) return;
      rateEdited.current = false;
      setRateText(String(Math.round(value.krwPer100Jpy * 100) / 100));
      if (!silent && alive.current && !current.signal.aborted) {
        setNotice(
          "참고 환율을 자동 갱신했어요. 카드사 실제 적용 환율은 다를 수 있어요.",
        );
      }
    } catch {
      if (
        !silent &&
        alive.current &&
        controller.current === current &&
        !current.signal.aborted
      ) {
        setNotice(
          "환율을 가져오지 못했어요. 저장된 환율이나 직접 입력을 이용해 주세요.",
        );
      }
    } finally {
      clearTimeout(timeout);
      if (controller.current === current) {
        controller.current = null;
        if (alive.current) setBusy(false);
      }
    }
  };

  const saveManual = async () => {
    // A response requested before manual editing must not replace that edit.
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
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

  let result: ReturnType<typeof calculatePayment> | null = null;
  let error = "";
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

  // Duty Free addition
  const handleAddReceipt = async () => {
    setReceiptError("");
    if (!storeName.trim()) {
      setReceiptError("구매처(매장명)를 입력해 주세요.");
      return;
    }
    const amount = Number(receiptJpy);
    if (!Number.isFinite(amount) || amount <= 0) {
      setReceiptError("올바른 엔화 금액을 입력해 주세요.");
      return;
    }
    const receipt: DutyFreeReceipt = {
      id: `df-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      storeName: storeName.trim(),
      category: receiptCategory,
      jpyAmount: amount,
      taxFreeApplied: receiptTaxFree,
      quantity:
        receiptCategory === "liquor" || receiptCategory === "tobacco"
          ? Number(itemCount) || 1
          : undefined,
      volumeMl:
        receiptCategory === "liquor" || receiptCategory === "perfume"
          ? Number(itemVolume) || (receiptCategory === "liquor" ? 700 : 50)
          : undefined,
      createdAt: Date.now(),
    };

    try {
      if (onSaveReceipt) {
        await onSaveReceipt(receipt);
      }
      setStoreName("");
      setReceiptJpy("");
      setItemCount("1");
      setItemVolume("700");
    } catch (e) {
      setReceiptError(
        e instanceof Error ? e.message : "영수증을 저장하지 못했어요.",
      );
    }
  };

  const customs = analyzeCustoms(dutyFreeReceipts, rate);
  const enteredRate = Number(rateText);
  const hasRate =
    Number.isFinite(enteredRate) && enteredRate > 0 && enteredRate <= 100000;
  const conversionList = hasRate ? quickConversions(enteredRate) : [];
  const smartPayment = calculateSmartPayment(Number(coinPrice) || 0);
  const warikan = calculateWarikan(
    Number(warikanTotal) || 0,
    Number(warikanPeople) || 1,
    hasRate ? enteredRate : 0,
  );
  const filteredSizes = sizeChartData.filter(
    (s) => s.category === sizeCategory,
  );

  return (
    <View style={{ gap: 22 }}>
      <ScreenHeader
        seal="払"
        title="계산은 똑똑하게"
        subtitle="환율 자동 최신화부터 5,000엔 면세, 동전 최소화 및 와리캉 정산까지."
      />

      <SubNav
        items={[
          { key: "calculator", label: "결제·할인", icon: "calculator-outline" },
          { key: "customs", label: "면세·세관 $800", icon: "receipt-outline" },
          { key: "coins", label: "동전·더치페이", icon: "cash-outline" },
          { key: "atm", label: "ATM·사이즈표", icon: "card-outline" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "calculator" ? (
        <>
          {/* Exchange Rate Card with Auto-Refresh */}
          <Card>
            <View style={styles.between}>
              <Label weight="700" size={17}>
                100엔당 원화 환율
              </Label>
              {rate ? (
                <View
                  style={{
                    backgroundColor:
                      isRateStale(rate) || rate.source === "manual"
                        ? c.soft
                        : c.accent,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        isRateStale(rate) || rate.source === "manual"
                          ? c.ink
                          : c.inverse,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {rate.source === "manual"
                      ? "직접 입력 환율"
                      : isRateStale(rate)
                        ? `저장된 환율 (${formatRateAge(rate.fetchedAt)})`
                        : `최신 환율 (${formatRateAge(rate.fetchedAt)} 갱신)`}
                  </Text>
                </View>
              ) : null}
            </View>

            <Field
              label="현재 환율 (100 JPY → KRW)"
              value={rateText}
              onChange={(value) => {
                rateEdited.current = true;
                controller.current?.abort();
                controller.current = null;
                setBusy(false);
                setRateText(value);
              }}
              numeric
            />

            <View style={styles.between}>
              <Label size={12} muted>
                {rate
                  ? `${rate.source === "manual" ? "수동 등록" : "Frankfurter 참고 환율(ECB)"} · 기준일: ${rate.date}`
                  : "환율을 직접 입력하거나 최신 환율을 가져와 주세요."}
              </Label>
              {onToggleAutoRefresh ? (
                <Choice
                  label="자동 최신화"
                  checkbox
                  selected={autoRefreshRate}
                  onPress={() => {
                    const next = !autoRefreshRate;
                    void onToggleAutoRefresh(next)
                      .then(() => {
                        if (next && isRateStale(rate) && !rateEdited.current)
                          void refresh(true);
                      })
                      .catch(() =>
                        setNotice(
                          "자동 최신화 설정을 저장하지 못했어요. 다시 시도해 주세요.",
                        ),
                      );
                  }}
                />
              ) : null}
            </View>
            {onToggleAutoRefresh && (
              <Label size={12} muted>
                {autoRefreshRate
                  ? "PAY 화면을 열 때 환율이 6시간보다 오래됐으면 Frankfurter에 JPY/KRW 환율만 조회해요."
                  : "자동 최신화를 켜면 PAY 화면을 열 때 오래된 환율을 알아서 갱신해요. 꺼져 있으면 버튼을 누를 때만 조회해요."}
              </Label>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button label="환율 저장" onPress={() => void saveManual()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="최신 환율 새로고침"
                  primary
                  icon="refresh-outline"
                  busy={busy}
                  onPress={() => void refresh(false)}
                />
              </View>
            </View>
          </Card>

          {/* Quick Currency Conversion Table */}
          <Card>
            <Label weight="700" size={16}>
              ⚡ 빠른 엔화-원화 환산표
            </Label>
            {!hasRate && (
              <Label muted>
                원화 환산을 보려면 환율을 입력하거나 가져와 주세요.
              </Label>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {conversionList.map((item) => (
                <View
                  key={item.jpy}
                  style={{
                    backgroundColor: c.soft,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    minWidth: "47%",
                    flex: 1,
                  }}
                >
                  <Label size={12} muted>
                    ¥{item.jpy.toLocaleString()}
                  </Label>
                  <Text
                    style={{
                      color: c.ink,
                      fontSize: 15,
                      fontWeight: "700",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    약 ₩{item.krw.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Price & Discounts Card */}
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
              첫 할인 후 남은 금액에 두 번째 할인을 적용해요. 서로 다른 세율
              상품은 나누어 계산하세요.
            </Label>
          </Card>

          {/* Tax Free Mode */}
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
              면세 자격·최소 구매액(5,000엔)·대상 상품을 매장에서 확인한 경우만
              선택하세요. 2026년 11월 1일부터 일본 면세는 출국 확인 후 환급
              방식으로 바뀝니다.
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
                참고 추정치예요. 매장 단수 처리·고정 수수료·환급 환율·카드사
                적립 제외 조건에 따라 달라집니다.
              </Label>
            </Card>
          )}
          {!!notice && <Label>{notice}</Label>}
        </>
      ) : tab === "customs" ? (
        <>
          {/* Duty Free & Customs Tracker Mode */}
          <Card>
            <Label weight="700" size={18}>
              대한민국 입국 세관 $800 면세 한도
            </Label>

            <View style={{ gap: 4 }}>
              <View style={styles.between}>
                <Label size={14}>
                  총 구매액: 약 ${customs.totalUsd.toLocaleString()} USD
                </Label>
                <Label
                  weight="700"
                  style={{ color: customs.isOverLimit ? c.error : c.accent }}
                >
                  {customs.isOverLimit
                    ? `한도 초과 (+$${Math.abs(customs.totalUsd - 800).toFixed(1)})`
                    : `잔여 $${customs.remainingUsd.toFixed(1)}`}
                </Label>
              </View>

              {/* Visual gauge bar */}
              <View
                style={{
                  height: 12,
                  backgroundColor: c.soft,
                  borderRadius: 6,
                  overflow: "hidden",
                  marginTop: 6,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round((customs.totalUsd / 800) * 100))}%`,
                    backgroundColor: customs.isOverLimit ? c.error : c.accent,
                  }}
                />
              </View>

              <Label muted size={12}>
                엔화 총액: ¥{customs.totalJpy.toLocaleString()} (약 ₩
                {customs.totalKrw.toLocaleString()})
              </Label>
            </View>

            {/* Tax-free saved badge */}
            <View
              style={{
                backgroundColor: c.soft,
                padding: 12,
                borderRadius: 12,
                gap: 4,
              }}
            >
              <Label weight="700" size={14}>
                🇯🇵 일본 면세 절약 세금 (소비세 10%)
              </Label>
              <Label size={13}>
                면세 적용 총액: ¥{customs.taxFreeTotalJpy.toLocaleString()} →
                절약 세금: 약 ¥{customs.estimatedTaxSavedJpy.toLocaleString()}
              </Label>
            </View>

            {/* Separate exemption allowances */}
            <Label weight="700" size={15}>
              별도 면세 품목 현황 (1인당)
            </Label>
            <View style={{ gap: 8 }}>
              <View
                style={[
                  styles.between,
                  { backgroundColor: c.soft, padding: 10, borderRadius: 10 },
                ]}
              >
                <Label size={13}>주류: 최대 2병, 2L 이하 ($400 이하)</Label>
                <Label
                  weight="700"
                  size={13}
                  style={{ color: customs.isLiquorOver ? c.error : c.ink }}
                >
                  {customs.liquorCount}병 ({customs.liquorVolumeMl}ml, $
                  {customs.liquorUsd})
                </Label>
              </View>

              <View
                style={[
                  styles.between,
                  { backgroundColor: c.soft, padding: 10, borderRadius: 10 },
                ]}
              >
                <Label size={13}>담배: 200개비 (1보루 이하)</Label>
                <Label
                  weight="700"
                  size={13}
                  style={{ color: customs.isTobaccoOver ? c.error : c.ink }}
                >
                  {customs.tobaccoCount}개비
                </Label>
              </View>

              <View
                style={[
                  styles.between,
                  { backgroundColor: c.soft, padding: 10, borderRadius: 10 },
                ]}
              >
                <Label size={13}>향수: 100ml 이하</Label>
                <Label
                  weight="700"
                  size={13}
                  style={{ color: customs.isPerfumeOver ? c.error : c.ink }}
                >
                  {customs.perfumeVolumeMl}ml
                </Label>
              </View>
            </View>
          </Card>

          {/* Add Receipt Form */}
          <Card>
            <Label weight="700" size={17}>
              영수증 / 구매 내역 추가
            </Label>
            <Field
              label="구매처 (매장명)"
              placeholder="예: 돈키호테 신주쿠점, 빅카메라"
              value={storeName}
              onChange={setStoreName}
            />
            <Field
              label="구매 금액 (엔 JPY)"
              placeholder="예: 8500"
              value={receiptJpy}
              onChange={(val) => {
                setReceiptJpy(val);
                // Auto recommend tax-free if >= 5000 JPY
                if (Number(val) >= TAX_FREE_MIN_JPY) {
                  setReceiptTaxFree(true);
                }
              }}
              numeric
            />

            <Label muted size={13}>
              품목 분류
            </Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(
                [
                  "consumable",
                  "general",
                  "liquor",
                  "tobacco",
                  "perfume",
                ] as const
              ).map((cat) => (
                <Choice
                  key={cat}
                  label={categoryLabels[cat].split(" ")[0]}
                  selected={receiptCategory === cat}
                  onPress={() => setReceiptCategory(cat)}
                />
              ))}
            </View>

            {receiptCategory === "liquor" || receiptCategory === "tobacco" ? (
              <Field
                label={receiptCategory === "liquor" ? "병 수" : "개비 수"}
                value={itemCount}
                onChange={setItemCount}
                numeric
              />
            ) : null}

            {receiptCategory === "liquor" || receiptCategory === "perfume" ? (
              <Field
                label="용량 (ml)"
                value={itemVolume}
                onChange={setItemVolume}
                numeric
              />
            ) : null}

            <Choice
              label="5,000엔 이상 면세(Tax-Free) 적용됨"
              checkbox
              selected={receiptTaxFree}
              onPress={() => setReceiptTaxFree(!receiptTaxFree)}
            />

            {receiptError ? (
              <Text accessibilityRole="alert" style={{ color: c.error }}>
                {receiptError}
              </Text>
            ) : null}

            <Button
              label="영수증 등록"
              primary
              icon="add-circle-outline"
              onPress={() => void handleAddReceipt()}
            />
          </Card>

          {/* List of registered receipts */}
          <Label weight="700" size={17}>
            등록된 쇼핑 내역 ({dutyFreeReceipts.length}건)
          </Label>
          {dutyFreeReceipts.length === 0 ? (
            <Card>
              <Label muted>
                등록된 영수증이 없어요. 구매 내역을 기록해 보세요.
              </Label>
            </Card>
          ) : (
            dutyFreeReceipts.map((item) => (
              <Card key={item.id}>
                <View style={styles.between}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <Label weight="700" size={17}>
                      {item.storeName}
                    </Label>
                    <Label muted size={12}>
                      {categoryLabels[item.category]} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Label>
                  </View>
                  <Text
                    style={{
                      color: c.ink,
                      fontSize: 18,
                      fontWeight: "700",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    ¥{item.jpyAmount.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.between}>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: item.taxFreeApplied
                        ? c.successSoft
                        : c.soft,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: item.taxFreeApplied ? c.success : c.ink,
                      }}
                    >
                      {item.taxFreeApplied
                        ? "면세 적용 (10% 절약)"
                        : "면세 미적용 (일반과세)"}
                    </Text>
                  </View>
                  {onDeleteReceipt ? (
                    <Button
                      label="삭제"
                      icon="trash-outline"
                      onPress={() => void onDeleteReceipt(item.id)}
                    />
                  ) : null}
                </View>
              </Card>
            ))
          )}
        </>
      ) : tab === "coins" ? (
        <>
          {/* Coin Minimizer Card */}
          <Card>
            <Label weight="700" size={17}>
              🪙 동전 지갑 털기 (거스름돈 최소화)
            </Label>
            <Label muted size={13}>
              결제 금액을 입력하면 잔돈으로 동전을 받지 않도록 지폐와 함께 낼
              가장 스마트한 금액을 계산해 드려요.
            </Label>

            <Field
              label="결제해야 할 금액 (엔)"
              value={coinPrice}
              onChange={setCoinPrice}
              numeric
            />

            <View
              style={{
                backgroundColor: c.soft,
                padding: 16,
                borderRadius: 14,
                gap: 6,
              }}
            >
              <Label weight="700" size={15}>
                추천 지불 방식
              </Label>
              <Text
                style={{
                  color: c.ink,
                  fontSize: 22,
                  fontWeight: "700",
                }}
              >
                ¥{smartPayment.totalToPay.toLocaleString()} 결제 시
              </Text>
              <Label size={14} style={{ color: c.accent, fontWeight: "700" }}>
                💡 {smartPayment.tip}
              </Label>
              <Label size={13}>
                • 지폐: ¥{smartPayment.payBills.toLocaleString()}
                {smartPayment.payCoins.length
                  ? ` + 동전: ¥${smartPayment.payCoins[0].value}`
                  : ""}
              </Label>
              <Label muted size={12}>
                예상 거스름돈: ¥{smartPayment.changeReceived.toLocaleString()}{" "}
                (동전 약 {smartPayment.changeCoinCount}개 수령)
              </Label>
            </View>
          </Card>

          {/* Warikan (Dutch Pay) Card */}
          <Card>
            <Label weight="700" size={17}>
              🤝 와리캉 (더치페이) 정산기
            </Label>
            <Label muted size={13}>
              식사나 술자리 후 총액을 인원수로 나누어 1인당 부담액을 계산해요.
            </Label>

            <Field
              label="총 지출 금액 (엔)"
              value={warikanTotal}
              onChange={setWarikanTotal}
              numeric
            />
            <Field
              label="인원수 (명)"
              value={warikanPeople}
              onChange={setWarikanPeople}
              numeric
            />

            <View
              style={{
                backgroundColor: c.soft,
                padding: 16,
                borderRadius: 14,
                gap: 8,
              }}
            >
              <View style={styles.between}>
                <Label weight="700" size={16}>
                  1인당 정확한 금액
                </Label>
                <Text
                  style={{
                    color: c.ink,
                    fontSize: 20,
                    fontWeight: "800",
                  }}
                >
                  ¥{warikan.exactPerPersonYen.toLocaleString()}
                </Text>
              </View>
              <Label muted size={12}>
                {hasRate
                  ? `원화 환산: 약 ₩${warikan.exactPerPersonKrw.toLocaleString()}`
                  : "원화 환산을 보려면 결제·할인에서 환율을 입력해 주세요."}
              </Label>

              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: c.line,
                  paddingTop: 8,
                  gap: 4,
                }}
              >
                <Label weight="700" size={13}>
                  동전 없이 깔끔하게 나누기:
                </Label>
                <Label size={13}>
                  • 100엔 올림: 1인당 ¥
                  {warikan.roundedUp100Yen.toLocaleString()} (잉여금 +¥
                  {warikan.surplusYen.toLocaleString()})
                </Label>
                <Label size={13}>
                  • 100엔 내림: 1인당 ¥
                  {warikan.roundedDown100Yen.toLocaleString()}
                </Label>
              </View>
            </View>
          </Card>
        </>
      ) : (
        <>
          {/* ATM Guides Card */}
          <Card>
            <Label weight="700" size={17}>
              🏧 일본 ATM 수수료 & 트래블카드 출금 가이드
            </Label>
            <Label muted size={13}>
              트래블로그, 트래블월렛, 토스 외화통장 카드로 현지 엔화 현금을
              출금할 때 수수료 무료 ATM 안내예요.
            </Label>
          </Card>

          {atmGuides.map((guide, idx) => (
            <Card key={idx}>
              <Label weight="700" size={16}>
                {guide.bank}
              </Label>
              <Label muted size={12}>
                위치: {guide.location}
              </Label>
              <View
                style={{
                  backgroundColor: c.soft,
                  padding: 10,
                  borderRadius: 10,
                  gap: 4,
                }}
              >
                <Label size={13} style={{ color: c.accent, fontWeight: "600" }}>
                  {guide.feeInfo}
                </Label>
                <Label muted size={12}>
                  💡 {guide.cardTips}
                </Label>
              </View>
            </Card>
          ))}

          {/* Size Chart Card */}
          <Card>
            <Label weight="700" size={17}>
              📏 일본 ↔ 한국 의류·신발 사이즈 규격표
            </Label>
            <Label muted size={13}>
              일본 쇼핑 시 의류 호수와 신발 사이즈가 다를 때 바로 비교해 보세요.
            </Label>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Choice
                label="신발 (Shoes)"
                selected={sizeCategory === "shoes"}
                onPress={() => setSizeCategory("shoes")}
              />
              <Choice
                label="여성 의류"
                selected={sizeCategory === "women-clothing"}
                onPress={() => setSizeCategory("women-clothing")}
              />
              <Choice
                label="남성 의류"
                selected={sizeCategory === "men-clothing"}
                onPress={() => setSizeCategory("men-clothing")}
              />
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              {filteredSizes.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.between,
                    {
                      backgroundColor: c.soft,
                      padding: 12,
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View style={{ gap: 2 }}>
                    <Label size={12} muted>
                      한국 규격
                    </Label>
                    <Label weight="700">{item.kr}</Label>
                  </View>
                  <View style={{ gap: 2, alignItems: "center" }}>
                    <Label size={12} muted>
                      일본 규격
                    </Label>
                    <Label weight="700" style={{ color: c.accent }}>
                      {item.jp}
                    </Label>
                  </View>
                  <View style={{ gap: 2, alignItems: "flex-end" }}>
                    <Label size={12} muted>
                      US / EU
                    </Label>
                    <Label size={12}>
                      {item.us} · {item.eu}
                    </Label>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}
    </View>
  );
}
