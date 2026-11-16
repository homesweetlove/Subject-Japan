import { useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { travelTools } from "../tools/native";
import {
  extractYenCandidates,
  type ScanPurpose,
  type YenCandidate,
} from "./yenOcr";
import {
  Button,
  Card,
  Hero,
  Icon,
  Label,
  ScreenHeader,
  SubNav,
  styles,
} from "../../ui/components";
import { Pop } from "../../ui/Rise";
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
  japanDay,
  receiptScheme,
  receiptTaxJpy,
  refundDaysLeft,
  refundDeadline,
  refundStatusLabels,
  refundSummary,
  estimateKoreaTax,
  sameStoreDayTaxExcluded,
  schemeFor,
  type DutyFreeCategory,
  type DutyFreeReceipt,
  type RefundStatus,
  type TaxFreeScheme,
  TAX_FREE_MIN_JPY,
} from "./taxFreeTracker";
import { TaxFreeGuide } from "./TaxFreeGuide";
import { ExpenseScreen } from "./ExpenseScreen";
import type { Expense } from "./expenses";
import type { Departure } from "../trip/departure";
import {
  atmGuides,
  ATM_CHECKED_ON,
  travelCardNotes,
  calculateSmartPayment,
  calculateWarikan,
  sizeChartData,
} from "./cashUtilities";

export type PayTab =
  "calculator" | "spend" | "taxfree" | "customs" | "coins" | "atm";

export function PayScreen({
  initialTab = "calculator",
  rate,
  onRate,
  dutyFreeReceipts = [],
  autoRefreshRate = false,
  onSaveReceipt,
  onDeleteReceipt,
  onToggleAutoRefresh,
  expenses = [],
  onSaveExpense,
  onDeleteExpense,
  departure = null,
  onSaveDeparture,
}: {
  expenses?: Expense[];
  onSaveExpense?: (e: Expense) => Promise<void>;
  onDeleteExpense?: (id: string) => Promise<void>;
  departure?: Departure | null;
  onSaveDeparture?: (d: Departure | null) => Promise<void>;
  initialTab?: PayTab;
  rate: ExchangeRate | null;
  onRate: (r: ExchangeRate) => Promise<void>;
  dutyFreeReceipts?: DutyFreeReceipt[];
  autoRefreshRate?: boolean;
  onSaveReceipt?: (receipt: DutyFreeReceipt) => Promise<void>;
  onDeleteReceipt?: (id: string) => Promise<void>;
  onToggleAutoRefresh?: (enabled: boolean) => Promise<void>;
}) {
  const c = useTheme();
  const [tab, setTab] = useState<PayTab>(initialTab);

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
  const [receiptScheme_, setReceiptScheme] = useState<TaxFreeScheme>(() =>
    schemeFor(Date.now()),
  );
  const [receiptRate, setReceiptRate] = useState<8 | 10>(10);
  const [itemCount, setItemCount] = useState("1");
  const [itemVolume, setItemVolume] = useState("700");
  const [receiptError, setReceiptError] = useState("");
  const [shoppingScan, setShoppingScan] = useState<{
    purpose: ScanPurpose;
    candidates: YenCandidate[];
    recognized: string;
  } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const scanSequence = useRef(0);
  const scanPending = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      scanSequence.current++;
      if (scanPending.current) void travelTools.cancel().catch(() => {});
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
        // A manual won rate keeps the last fetched dollar rate (with its date).
        ...(rate?.usdPerJpy !== undefined && rate.usdDate
          ? { usdPerJpy: rate.usdPerJpy, usdDate: rate.usdDate }
          : {}),
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

  // Suggestions only: neither an OCR result nor a photo creates a payment record.
  const scanYen = async (purpose: ScanPurpose, camera: boolean) => {
    if (scanPending.current) return;
    if (Platform.OS !== "android" || !travelTools.available) {
      setScanNotice("금액 사진 인식은 전용 Android 앱에서 이용할 수 있어요.");
      return;
    }
    const token = ++scanSequence.current;
    scanPending.current = true;
    setScanning(true);
    setScanNotice("");
    setShoppingScan(null);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error("카메라 권한을 허용해 주세요.");
      }
      if (!alive.current || token !== scanSequence.current) return;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.85,
        exif: false,
        base64: false,
      };
      const photo = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (photo.canceled || !photo.assets?.length) return;
      if (!alive.current || token !== scanSequence.current) return;
      const recognized = await travelTools.recognizeImage(
        photo.assets[0].uri,
        "ja",
      );
      if (!alive.current || token !== scanSequence.current) return;
      const candidates = extractYenCandidates(recognized, purpose);
      setShoppingScan({
        purpose,
        candidates,
        recognized: recognized.slice(0, 250),
      });
      setScanNotice(
        candidates.length
          ? "금액 후보를 직접 선택한 다음 원본 사진과 다시 대조해 주세요."
          : "금액을 확실히 찾지 못했어요. 원본을 보고 직접 입력해 주세요.",
      );
    } catch (error) {
      if (alive.current && token === scanSequence.current)
        setScanNotice(
          error instanceof Error
            ? error.message
            : "사진에서 금액을 인식하지 못했어요.",
        );
    } finally {
      scanPending.current = false;
      if (alive.current && token === scanSequence.current) setScanning(false);
    }
  };
  const scanActions = (
    purpose: ScanPurpose,
    choose: (amount: number) => void,
  ) => (
    <View style={{ gap: 8 }}>
      <Button
        label={
          purpose === "price"
            ? "카메라로 가격표 금액 찾기"
            : "카메라로 영수증 금액 찾기"
        }
        icon="camera-outline"
        busy={scanning}
        onPress={() => void scanYen(purpose, true)}
      />
      <Button
        label="갤러리 사진에서 금액 찾기"
        disabled={scanning}
        onPress={() => void scanYen(purpose, false)}
      />
      {shoppingScan?.purpose === purpose ? (
        <View style={{ gap: 8 }}>
          {shoppingScan.candidates.map((candidate) => (
            <Button
              key={candidate.amount}
              label={`¥${candidate.amount.toLocaleString()} 선택 · ${candidate.line.slice(0, 22)}`}
              onPress={() => {
                choose(candidate.amount);
                setScanNotice(
                  "선택한 금액을 입력했어요. 세금 포함 여부와 원본 금액을 확인해 주세요.",
                );
              }}
            />
          ))}
          {!shoppingScan.candidates.length && !!shoppingScan.recognized ? (
            <Label size={12} muted>
              {shoppingScan.recognized}
            </Label>
          ) : null}
        </View>
      ) : null}
      {!!scanNotice && (
        <Label size={12} muted>
          {scanNotice}
        </Label>
      )}
      <Label size={12} muted>
        기기에서 금액 후보를 찾아요. 자동 결제·기록은 하지 않으며 세금·할인·면세
        여부는 직접 확인해야 해요.
      </Label>
    </View>
  );

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
      scheme: receiptScheme_,
      taxRate: receiptRate,
      refundStatus:
        receiptScheme_ === "refund" && receiptTaxFree ? "waiting" : undefined,
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
  const nowMs = Date.now();
  const refunds = refundSummary(dutyFreeReceipts, nowMs);
  const koreaTax = estimateKoreaTax(customs, rate);
  // The 5,000 yen rule is per store per day, before tax.
  const draftAmount = Number(receiptJpy);
  const draftTaxExcluded =
    Number.isFinite(draftAmount) && draftAmount > 0
      ? receiptScheme_ === "refund"
        ? Math.round((draftAmount * 100) / (100 + receiptRate))
        : draftAmount
      : 0;
  const draftDayTotal =
    draftTaxExcluded +
    (storeName.trim()
      ? sameStoreDayTaxExcluded(dutyFreeReceipts, storeName, nowMs)
      : 0);
  const setRefundStatus = (item: DutyFreeReceipt, status: RefundStatus) =>
    onSaveReceipt?.({ ...item, refundStatus: status }).catch((e) =>
      setReceiptError(
        e instanceof Error ? e.message : "상태를 저장하지 못했어요.",
      ),
    );
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
        title="계산은 똑똑하게"
        subtitle="환율, 할인 계산, 새 면세 환급 안내와 기록, 동전·더치페이까지."
      />

      <SubNav
        items={[
          { key: "calculator", label: "결제·할인", icon: "calculator-outline" },
          { key: "spend", label: "지출 기록", icon: "wallet-outline" },
          { key: "taxfree", label: "새 면세 안내", icon: "airplane-outline" },
          { key: "customs", label: "면세 기록·세관", icon: "receipt-outline" },
          { key: "coins", label: "동전·더치페이", icon: "cash-outline" },
          { key: "atm", label: "ATM·사이즈표", icon: "card-outline" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "calculator" ? (
        <>
          {/* Price & Discounts Card */}
          <Card>
            {Platform.OS === "android"
              ? scanActions("price", (amount) => setPrice(String(amount)))
              : null}
            <Field
              label="상품 금액 (엔)"
              value={price}
              onChange={setPrice}
              numeric
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[true, false].map((v) => (
                <Choice
                  key={String(v)}
                  label={v ? "세금 포함 가격" : "세금 별도 가격"}
                  selected={includesTax === v}
                  onPress={() => setIncludesTax(v)}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
                      "예전 방식: 계산대에서 세금 빼기 (10월 31일까지)",
                      "새 방식: 세금 내고 출국 때 돌려받기",
                    ][i]
                  }
                  selected={taxMode === v}
                  onPress={() => setTaxMode(v)}
                />
              ))}
            </View>
            <Label muted size={12}>
              2026년 11월 1일 구매분부터는 새 방식만 있어요. 같은 매장 같은 날
              세금 빼고 5,000엔 이상, 90일 안에 출국하면서 공항 세관 확인을
              받아야 돌려받아요.
            </Label>
            <Button
              label="새 면세 방식 자세히 보기"
              icon="airplane-outline"
              onPress={() => setTab("taxfree")}
            />
            <Field
              label="환급 세액에서 차감되는 수수료 (%)"
              value={refundFee}
              onChange={setRefundFee}
              numeric
            />
            <Label muted size={12}>
              환급 수수료와 방법(카드·앱·현금)은 매장·환급 업체마다 달라요.
            </Label>
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
            <Hero>
              <Label weight="700">예상 최종 부담액</Label>
              <Pop trigger={result.krw}>
                <Label size={44} weight="700">
                  ₩{result.krw.toLocaleString()}
                </Label>
              </Pop>
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
            </Hero>
          )}
          {!!notice && <Label>{notice}</Label>}

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
                  ? "PAY 화면을 열 때 환율이 6시간보다 오래됐으면 Frankfurter에 엔화의 원화·달러 환율만 조회해요."
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
              빠른 엔화-원화 환산표
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
        </>
      ) : tab === "spend" ? (
        <ExpenseScreen
          expenses={expenses}
          krwPer100Jpy={rate?.krwPer100Jpy}
          onSave={onSaveExpense ?? (async () => {})}
          onDelete={onDeleteExpense ?? (async () => {})}
        />
      ) : tab === "taxfree" ? (
        <TaxFreeGuide
          onOpenTracker={() => setTab("customs")}
          waitingReceipts={refunds.waitingCount}
          departure={departure}
          onSaveDeparture={onSaveDeparture}
        />
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
                엔화 총액: ¥{customs.totalJpy.toLocaleString()}
                {customs.totalKrw !== null
                  ? ` (약 ₩${customs.totalKrw.toLocaleString()})`
                  : ""}
              </Label>
              <Label
                muted={!customs.usdIsEstimate}
                size={12}
                style={
                  customs.usdIsEstimate ? { color: c.accentInk } : undefined
                }
              >
                {customs.usdIsEstimate
                  ? "달러는 1달러=148엔으로 어림한 값이에요. 결제·할인에서 '최신 환율 새로고침'을 누르면 실제 달러 환율로 계산해요."
                  : `1달러 = ${(1 / customs.usdPerJpy).toFixed(2)}엔 (${rate?.usdDate} 환율)으로 계산했어요. 세관은 입국 때 고시 환율을 써서 조금 다를 수 있어요.`}
              </Label>
            </View>

            {customs.isOverLimit ? <KoreaTaxCard estimate={koreaTax} /> : null}

            {/* Japan consumption tax: refunds still to come and old savings */}
            <View
              style={{
                backgroundColor: c.soft,
                padding: 12,
                borderRadius: 12,
                gap: 4,
              }}
            >
              <Label weight="700" size={14}>
                일본 소비세 돌려받기
              </Label>
              <Label size={13}>
                돌려받을 예정 약 ¥{refunds.expectedJpy.toLocaleString()} · 받은
                돈 약 ¥{refunds.receivedJpy.toLocaleString()}
              </Label>
              {refunds.nextDeadline !== null && (
                <Label size={13} style={{ color: c.accentInk }}>
                  세관 확인 전 영수증 {refunds.waitingCount}장 · 가장 빠른 마감{" "}
                  {japanDay(refunds.nextDeadline)}
                </Label>
              )}
              {refunds.lostJpy > 0 && (
                <Label size={13} style={{ color: c.error }}>
                  90일이 지나 돌려받을 수 없는 세금 약 ¥
                  {refunds.lostJpy.toLocaleString()}
                </Label>
              )}
              <Label muted size={12}>
                전체 면세 세금 합계 약 ¥
                {customs.estimatedTaxSavedJpy.toLocaleString()} (10월 31일까지
                계산대에서 뺀 세금 포함). 환급 수수료는 빼지 않은 값이에요.
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
                <Label size={13}>
                  주류: 합계 2L 이하·$400 이하 (병 수 제한 없음)
                </Label>
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
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Choice
                label="11월 1일부터 구매 (새 방식)"
                selected={receiptScheme_ === "refund"}
                onPress={() => setReceiptScheme("refund")}
              />
              <Choice
                label="10월 31일까지 구매 (예전 방식)"
                selected={receiptScheme_ === "instant"}
                onPress={() => setReceiptScheme("instant")}
              />
            </View>
            {Platform.OS === "android"
              ? scanActions("receipt", (amount) =>
                  setReceiptJpy(String(amount)),
                )
              : null}
            <Field
              label={
                receiptScheme_ === "refund"
                  ? "결제한 금액 (엔, 세금 포함)"
                  : "결제한 금액 (엔, 세금 뺀 값)"
              }
              placeholder="예: 8500"
              value={receiptJpy}
              onChange={setReceiptJpy}
              numeric
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Choice
                label="소비세 10%"
                selected={receiptRate === 10}
                onPress={() => setReceiptRate(10)}
              />
              <Choice
                label="8% (먹을거리·음료, 술 제외)"
                selected={receiptRate === 8}
                onPress={() => setReceiptRate(8)}
              />
            </View>
            {draftTaxExcluded > 0 && draftDayTotal < TAX_FREE_MIN_JPY ? (
              <Label size={12} style={{ color: c.accentInk }}>
                같은 매장 오늘 합계가 세금 빼고 ¥
                {draftDayTotal.toLocaleString()}이에요. 5,000엔이 넘어야 면세가
                돼요.
              </Label>
            ) : null}

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
              label={
                receiptScheme_ === "refund"
                  ? "매장에서 면세 절차를 했어요 (여권 보여주고 환급 방법 등록)"
                  : "계산대에서 면세 받았어요"
              }
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

                <ReceiptRefund
                  item={item}
                  now={nowMs}
                  onStatus={
                    onSaveReceipt
                      ? (status) => void setRefundStatus(item, status)
                      : undefined
                  }
                />
                {onDeleteReceipt ? (
                  <Button
                    label={`${item.storeName} 삭제`}
                    icon="trash-outline"
                    size="sm"
                    variant="ghost"
                    onPress={() => void onDeleteReceipt(item.id)}
                  />
                ) : null}
              </Card>
            ))
          )}
        </>
      ) : tab === "coins" ? (
        <>
          {/* Coin Minimizer Card */}
          <Card>
            <Label weight="700" size={17}>
              동전 지갑 털기 (거스름돈 최소화)
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
                {smartPayment.tip}
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
              와리캉 (더치페이) 정산기
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
              일본 ATM 수수료 & 트래블카드 출금 가이드
            </Label>
            <Label muted size={13}>
              트래블로그, 트래블월렛, 토스 외화통장 카드로 현지 엔화 현금을 뽑을
              때 어느 기계가 유리한지 정리했어요. ({ATM_CHECKED_ON} 확인)
            </Label>
            {travelCardNotes.map((note) => (
              <Label key={note} muted size={12}>
                • {note}
              </Label>
            ))}
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
                  {guide.cardTips}
                </Label>
              </View>
            </Card>
          ))}

          {/* Size Chart Card */}
          <Card>
            <Label weight="700" size={17}>
              일본 ↔ 한국 의류·신발 사이즈 규격표
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

/** Tax status of one receipt: what comes back, by when, and where it stands. */
function ReceiptRefund({
  item,
  now,
  onStatus,
}: {
  item: DutyFreeReceipt;
  now: number;
  onStatus?: (status: RefundStatus) => void;
}) {
  const c = useTheme();
  const tax = receiptTaxJpy(item);
  if (!item.taxFreeApplied)
    return (
      <Label muted size={13}>
        면세 없이 산 물건이에요.
      </Label>
    );
  if (receiptScheme(item) === "instant")
    return (
      <Label size={13} style={{ color: c.success }}>
        계산대에서 세금 약 ¥{tax.toLocaleString()}을 이미 뺐어요 (예전 방식).
      </Label>
    );
  const status = item.refundStatus ?? "waiting";
  const daysLeft = refundDaysLeft(item, now);
  const late = status === "waiting" && daysLeft < 0;
  // Anything used up in Japan cannot pass the customs check.
  const keepSealed =
    status === "waiting" && !late && item.category !== "general";
  return (
    <View style={{ gap: 8 }}>
      <Label size={13} weight="600">
        돌려받을 세금 약 ¥{tax.toLocaleString()}
      </Label>
      {keepSealed && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            backgroundColor: c.accentSoft,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Icon name="hand-left-outline" size={14} color={c.accentInk} />
          <Text style={{ color: c.accentInk, fontSize: 12, fontWeight: "700" }}>
            출국 전까지 일본에서 뜯거나 쓰지 마세요
          </Text>
        </View>
      )}
      {status === "waiting" && (
        <Label size={12} style={{ color: late ? c.error : c.accentInk }}>
          {late
            ? "90일이 지나 이 영수증은 돌려받을 수 없어요."
            : `${japanDay(refundDeadline(item))}까지 출국하며 세관 확인 (${daysLeft}일 남음)`}
        </Label>
      )}
      {onStatus && !late && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {(["waiting", "confirmed", "refunded"] as const).map((value) => (
            <Choice
              key={value}
              label={refundStatusLabels[value]}
              selected={status === value}
              onPress={() => onStatus(value)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Rough Korean entry tax once the $800 allowance is exceeded. */
function KoreaTaxCard({
  estimate,
}: {
  estimate: ReturnType<typeof estimateKoreaTax>;
}) {
  const c = useTheme();
  const won = (n: number) => `₩${n.toLocaleString()}`;
  return (
    <View
      style={{
        backgroundColor: c.accentSoft,
        padding: 12,
        borderRadius: 12,
        gap: 4,
      }}
    >
      <Label weight="700" size={14} style={{ color: c.accentInk }}>
        한국 들어갈 때 낼 세금 (어림)
      </Label>
      {estimate ? (
        <>
          <Label size={14}>
            ${estimate.excessUsd} 초과 → 자진 신고하면 약{" "}
            {won(estimate.selfDeclaredKrw)}
          </Label>
          <Label muted size={12}>
            신고 안 하고 걸리면 약 {won(estimate.undeclaredKrw)} (가산세 40%).
            일반 물품 20%로 계산했고, 옷·화장품·명품 가방·시계는 세율이 달라요.
            1달러 = {estimate.krwPerUsd.toLocaleString()}원 기준.
          </Label>
        </>
      ) : (
        <Label size={13}>
          결제·할인에서 '최신 환율 새로고침'을 누르면 원화로 어림해 드려요.
        </Label>
      )}
      <Label muted size={12}>
        $800을 넘으면 입국 때 자진 신고가 거의 항상 이득이에요 (세금 30% 감면,
        최대 20만 원). 정확한 세액은 관세청 '여행자 휴대품 예상세액 조회'에서
        확인하세요.
      </Label>
    </View>
  );
}
