import { useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScreenHeader,
  Button,
  Card,
  IconButton,
  Label,
  styles,
} from "../../ui/components";
import { useTheme } from "../../ui/theme";
import { couponCatalog } from "./catalog";
import {
  audienceLabels,
  couponDDay,
  couponStatus,
  filterCoupons,
  isOfficialCouponUrl,
  statusLabels,
  type Coupon,
  type CouponAudience,
  type CouponCategory,
} from "./model";
import {
  couponSourceStatusLabel,
  fetchCouponSourceStatuses,
  formatRemoteCheckedAt,
  type CouponSourceStatus,
} from "./liveStatus";

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: 15,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: selected ? c.selected : c.line,
        backgroundColor: selected ? c.selected : c.soft,
      }}
    >
      <Text
        style={{
          color: selected ? c.onSelected : c.ink,
          fontSize: 13,
          fontWeight: selected ? "700" : "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function DetailSection({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Label weight="700">{title}</Label>
      <Label muted size={14}>
        {children}
      </Label>
    </View>
  );
}
export function CouponScreen({
  savedIds,
  onToggleSaved,
}: {
  savedIds: string[];
  onToggleSaved: (id: string) => Promise<void>;
}) {
  const c = useTheme();
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<CouponAudience | "all">("all");
  const [category, setCategory] = useState<CouponCategory | "all">("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [validOnly, setValidOnly] = useState(false);
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [sourceStatuses, setSourceStatuses] = useState<
    Record<string, CouponSourceStatus>
  >({});
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetchCouponSourceStatuses(controller.signal)
      .then(setSourceStatuses)
      .catch(() => {
        // Live freshness is an enhancement; the built-in catalog remains usable offline.
      });
    return () => controller.abort();
  }, []);
  const results = filterCoupons(couponCatalog, {
    query,
    audience,
    category,
    savedOnly,
    savedIds,
    validOnly,
    now,
  });
  const save = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await onToggleSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "혜택을 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const openOfficial = async (coupon: Coupon) => {
    setError("");
    try {
      if (!isOfficialCouponUrl(coupon.officialUrl))
        throw new Error("Invalid source");
      await Linking.openURL(coupon.officialUrl);
    } catch {
      setError(
        "공식 페이지를 열지 못했어요. 네트워크와 브라우저를 확인해 주세요.",
      );
    }
  };
  const resetFilters = () => {
    setQuery("");
    setAudience("all");
    setCategory("all");
    setSavedOnly(false);
    setValidOnly(false);
  };
  const categories = [
    ...new Set(couponCatalog.map((coupon) => coupon.category)),
  ];
  return (
    <View style={{ gap: 22 }}>
      <ScreenHeader
        title="쿠폰"
        subtitle="할인 조건과 공식 페이지 최신 상태를 빠르게 확인합니다."
      />
      <TextInput
        accessibilityLabel="매장·혜택 검색"
        placeholder="매장, 브랜드, 혜택 검색"
        value={query}
        onChangeText={setQuery}
        maxLength={100}
        placeholderTextColor={c.muted}
        style={{
          color: c.ink,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 7,
          padding: 16,
          fontSize: 15,
        }}
      />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip
            label="모든 대상"
            selected={audience === "all"}
            onPress={() => setAudience("all")}
          />
          {(["general", "visitor"] as const).map((value) => (
            <Chip
              key={value}
              label={audienceLabels[value]}
              selected={audience === value}
              onPress={() => setAudience(value)}
            />
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            label="모든 업종"
            selected={category === "all"}
            onPress={() => setCategory("all")}
          />
          {categories.map((value) => (
            <Chip
              key={value}
              label={value}
              selected={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.between}>
        <Label muted size={13}>
          {results.length}개의 혜택
        </Label>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip
            label="사용 가능만"
            selected={validOnly}
            onPress={() => setValidOnly((value) => !value)}
          />
          <Chip
            label="저장한 혜택만"
            selected={savedOnly}
            onPress={() => setSavedOnly((value) => !value)}
          />
        </View>
      </View>
      <Label muted size={12}>
        공식 안내를 정리한 목록으로 실시간 발급·재고를 보장하지 않아요. 일반
        고객용도 일본 앱 가입 등 개별 조건을 확인해 주세요.
      </Label>
      {error && !selected ? (
        <Text accessibilityRole="alert" style={{ color: c.error }}>
          {error}
        </Text>
      ) : null}
      {results.length === 0 ? (
        <Card>
          <Label weight="600">조건에 맞는 혜택이 없어요</Label>
          <Label muted>
            검색어·필터를 바꾸거나 마음에 드는 혜택을 저장해 보세요.
          </Label>
          <Button label="필터 초기화" onPress={resetFilters} />
        </Card>
      ) : null}
      {results.map((coupon) => {
        const dDayInfo = couponDDay(coupon, now);
        const status = couponStatus(coupon, now);
        const sourceStatus = sourceStatuses[coupon.id];
        const sourceLabel = couponSourceStatusLabel(sourceStatus);
        return (
          <Card key={coupon.id}>
            <View style={styles.between}>
              <Label muted size={12}>
                {audienceLabels[coupon.audience]} · {coupon.category}
              </Label>
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor:
                      dDayInfo.status === "ending-soon" ||
                      dDayInfo.status === "d-day"
                        ? c.accent
                        : c.soft,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color:
                        dDayInfo.status === "ending-soon" ||
                        dDayInfo.status === "d-day"
                          ? c.inverse
                          : c.ink,
                    }}
                  >
                    {dDayInfo.label}
                  </Text>
                </View>
                <Label muted size={12}>
                  {statusLabels[status]}
                </Label>
              </View>
            </View>
            <View style={{ gap: 3 }}>
              <Label weight="700" size={21}>
                {coupon.merchant}
              </Label>
              <Label muted size={13}>
                {coupon.title}
              </Label>
            </View>
            <Label size={19} weight="600">
              {coupon.benefit}
            </Label>
            <Label muted size={13}>
              {coupon.registrationRequired
                ? "일본 앱·회원 발급 조건 확인 필요"
                : coupon.audience === "visitor"
                  ? "여권·방문객 자격 등 사용 조건 확인"
                  : "개인 컵 등 사용 조건 확인"}
            </Label>
            {sourceLabel ? (
              <Label
                size={12}
                weight="600"
                style={{
                  color:
                    sourceStatus?.changed || sourceStatus?.state === "stale"
                      ? c.error
                      : c.accent,
                }}
              >
                {sourceLabel}
              </Label>
            ) : null}
            <View style={styles.between}>
              <Button
                label={`${coupon.merchant} 상세 보기`}
                onPress={() => {
                  setError("");
                  setSelected(coupon);
                }}
              />
              <Button
                label={`${coupon.merchant} ${savedIds.includes(coupon.id) ? "저장 해제" : "저장"}`}
                icon={
                  savedIds.includes(coupon.id) ? "bookmark" : "bookmark-outline"
                }
                disabled={busy}
                onPress={() => void save(coupon.id)}
              />
            </View>
          </Card>
        );
      })}
      <Label muted size={12}>
        목록과 저장한 혜택은 기기에서 볼 수 있어요. 실제 사용에는 공식
        사이트·앱의 최신 쿠폰이 필요하며, 주변 매장 검색은 아직 지원하지 않아요.
      </Label>
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
        presentationStyle="pageSheet"
      >
        {selected ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View
              style={{
                flex: 1,
                width: "100%",
                maxWidth: 620,
                alignSelf: "center",
              }}
            >
              <View
                style={[
                  styles.between,
                  { paddingHorizontal: 24, paddingVertical: 10 },
                ]}
              >
                <Label weight="700">혜택 사용 안내</Label>
                <IconButton
                  name="close"
                  label="혜택 상세 닫기"
                  onPress={() => setSelected(null)}
                />
              </View>
              <ScrollView
                contentContainerStyle={{
                  padding: 24,
                  paddingBottom: 40,
                  gap: 24,
                }}
              >
                <View style={{ gap: 8 }}>
                  <Label muted size={12}>
                    {audienceLabels[selected.audience]} · {selected.category}
                  </Label>
                  <Label weight="700" size={28}>
                    {selected.merchant}
                  </Label>
                  <Label size={21} weight="600">
                    {selected.benefit}
                  </Label>
                  <Label muted>{selected.title}</Label>
                </View>
                <Card>
                  <Label weight="600">
                    {couponSourceStatusLabel(sourceStatuses[selected.id]) ??
                      statusLabels[couponStatus(selected, now)]}
                  </Label>
                  <Label muted size={13}>
                    앱 내 검토일 {selected.checkedOn}
                    {sourceStatuses[selected.id]?.checkedAt
                      ? `\n자동 확인 ${formatRemoteCheckedAt(
                          sourceStatuses[selected.id].checkedAt,
                        ) ?? ""}`
                      : ""}
                    {"\n"}자동 확인은 공식 페이지 접근 상태와 변경 여부를 보는
                    보조 정보예요. 결제 전 실제 쿠폰 조건을 확인해 주세요.
                  </Label>
                </Card>
                <DetailSection title="누가 사용할 수 있나요?">
                  {selected.eligibility}
                </DetailSection>
                <DetailSection title="최소 구매 조건">
                  {selected.minimumSpend}
                </DetailSection>
                <DetailSection title="유효기간">
                  {selected.validity}
                </DetailSection>
                {selected.expiresOn ? (
                  <Label muted>
                    게시된 종료일: {selected.expiresOn} (일본 시간)
                  </Label>
                ) : null}
                <DetailSection title="대상 매장">
                  {selected.stores}
                </DetailSection>
                <DetailSection title="사용 방법">
                  {selected.steps
                    .map((step, index) => `${index + 1}. ${step}`)
                    .join("\n\n")}
                </DetailSection>
                <DetailSection title="제외·주의 조건">
                  {selected.exclusions.join("\n\n")}
                </DetailSection>
                <DetailSection title="다른 할인과 함께 쓰기">
                  {selected.stacking}
                </DetailSection>
                <View style={{ gap: 8 }}>
                  <Label muted size={12}>
                    {selected.sourceLabel ?? "공식 출처"} · 외부 브라우저로
                    열립니다
                  </Label>
                  <Text
                    selectable
                    style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}
                  >
                    {selected.officialUrl}
                  </Text>
                </View>
                {error ? (
                  <Text accessibilityRole="alert" style={{ color: c.error }}>
                    {error}
                  </Text>
                ) : null}
                <Button
                  label="공식 안내·쿠폰 열기"
                  icon="open-outline"
                  primary
                  onPress={() => void openOfficial(selected)}
                />
                <Button
                  label={
                    savedIds.includes(selected.id)
                      ? "이 혜택 저장 해제"
                      : "이 혜택 저장"
                  }
                  icon="bookmark-outline"
                  busy={busy}
                  onPress={() => void save(selected.id)}
                />
                <Label muted size={12}>
                  Subject Japan은 쿠폰 발급처가 아니에요. 여권·매장 계정 정보를
                  수집하지 않으며, 저장 목록만 이 기기에 보관합니다.
                </Label>
              </ScrollView>
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>
    </View>
  );
}
