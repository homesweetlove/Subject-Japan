import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  ScreenHeader,
  Button,
  Card,
  IconButton,
  Label,
  styles,
} from "../../ui/components";
import { useTheme } from "../../ui/theme";
import { useNow } from "../../ui/useNow";
import { bundledFeed } from "./catalog";
import { cachedFeed, refreshFeed } from "./feed";
import { Choice } from "../../ui/Choice";
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
import { Press } from "../../ui/Press";
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
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      pressScale={0.96}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: 15,
        borderRadius: 22,
        backgroundColor: selected
          ? c.selected
          : pressed
            ? c.softPressed
            : c.soft,
      })}
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
    </Press>
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
  autoRefresh,
  onAutoRefresh,
  savedIds,
  onToggleSaved,
}: {
  autoRefresh: boolean;
  onAutoRefresh: (enabled: boolean) => Promise<void>;
  savedIds: string[];
  onToggleSaved: (id: string) => Promise<void>;
}) {
  const c = useTheme();
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<CouponAudience | "all">("all");
  const [category, setCategory] = useState<CouponCategory | "all">("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [validOnly, setValidOnly] = useState(false);
  const [feed, setFeed] = useState(bundledFeed);
  const categories = useMemo(
    () => [...new Set(feed.items.map((c) => c.category))],
    [feed],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = feed.items.find((c) => c.id === selectedId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSources, setCheckingSources] = useState(false);
  const [sourceNotice, setSourceNotice] = useState("");
  const [sourceStatuses, setSourceStatuses] = useState<
    Record<string, CouponSourceStatus>
  >({});
  const request = useRef<AbortController | null>(null);
  const checkSources = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setCheckingSources(true);
    setSourceNotice("");
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const previous = await cachedFeed();
      const [catalog, sources] = await Promise.allSettled([
        refreshFeed(controller.signal),
        fetchCouponSourceStatuses(controller.signal),
      ]);
      if (request.current !== controller) return;
      if (catalog.status === "fulfilled") setFeed(catalog.value);
      if (sources.status === "fulfilled") setSourceStatuses(sources.value);
      else setSourceStatuses({});
      setSourceNotice(
        [
          catalog.status === "fulfilled"
            ? catalog.value.revision > previous.revision
              ? "새 쿠폰 혜택을 내려받았어요."
              : "새로 배포된 혜택이 없어요. 기존 목록을 유지해요."
            : "목록을 받지 못해 기기의 혜택을 표시해요.",
          sources.status === "rejected"
            ? "출처 확인 서버에 연결하지 못했어요."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setCheckingSources(false);
      }
    }
  }, []);
  useEffect(() => {
    let active = true;
    void cachedFeed().then((cached) => {
      if (active)
        setFeed((current) =>
          cached.revision > current.revision ? cached : current,
        );
    });
    return () => {
      active = false;
      request.current?.abort();
      request.current = null;
    };
  }, []);
  useEffect(() => {
    if (autoRefresh) void checkSources();
  }, [autoRefresh, checkSources]);
  const now = useNow(60000);
  // Typing stays responsive; the list catches up with the deferred query.
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () =>
      filterCoupons(feed.items, {
        query: deferredQuery,
        audience,
        category,
        savedOnly,
        savedIds,
        validOnly,
        now,
      }),
    [
      feed,
      deferredQuery,
      audience,
      category,
      savedOnly,
      savedIds,
      validOnly,
      now,
    ],
  );
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

  return (
    <View style={{ gap: 22 }}>
      <ScreenHeader
        title="같은 여행, 더 좋은 혜택"
        subtitle="방문객 전용 쿠폰부터 일본 고객이 쓰는 일상 혜택까지."
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
          borderRadius: 16,
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
      <View style={{ gap: 6 }}>
        <Button
          label="쿠폰 혜택 새로고침"
          icon="refresh-outline"
          busy={checkingSources}
          onPress={() => void checkSources()}
        />
        <Choice
          checkbox
          label="탭을 열 때 자동 새로고침"
          selected={autoRefresh}
          onPress={() =>
            void onAutoRefresh(!autoRefresh).catch(() =>
              setError("자동 새로고침 설정을 저장하지 못했어요."),
            )
          }
        />
        <Label muted size={11}>
          새로고침하면 공개 쿠폰 목록과 출처별 확인 시각을 받아요.
        </Label>
        {!!sourceNotice && <Label size={12}>{sourceNotice}</Label>}
      </View>
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
            {sourceStatus ? (
              <Label
                size={12}
                style={{
                  color:
                    sourceStatus.changed || sourceStatus.state === "stale"
                      ? c.error
                      : c.muted,
                }}
              >
                {couponSourceStatusLabel(sourceStatus)}
                {formatRemoteCheckedAt(sourceStatus.checkedAt)
                  ? ` · ${formatRemoteCheckedAt(sourceStatus.checkedAt)}`
                  : ""}
              </Label>
            ) : null}
            <View style={styles.between}>
              <Button
                label={`${coupon.merchant} 상세 보기`}
                onPress={() => {
                  setError("");
                  setSelectedId(coupon.id);
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
        사이트·앱의 최신 쿠폰이 필요해요.
      </Label>
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
        presentationStyle="pageSheet"
      >
        {selected ? (
          // A native modal is its own root; give it insets of its own.
          <SafeAreaProvider>
            <SafeAreaView
              accessibilityViewIsModal
              style={{ flex: 1, backgroundColor: c.bg }}
            >
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
                    onPress={() => setSelectedId(null)}
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
                      {statusLabels[couponStatus(selected, now)]}
                    </Label>
                    {sourceStatuses[selected.id] ? (
                      <Label size={13} muted>
                        {couponSourceStatusLabel(sourceStatuses[selected.id])}
                        {formatRemoteCheckedAt(
                          sourceStatuses[selected.id].checkedAt,
                        )
                          ? ` · ${formatRemoteCheckedAt(sourceStatuses[selected.id].checkedAt)}`
                          : ""}
                      </Label>
                    ) : null}
                    <Label muted size={13}>
                      공식 안내 확인일 {selected.checkedOn}
                      {"\n"}확인일은 사용 보장일이 아니에요. 결제 전 최신 조건을
                      확인해 주세요.
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
                    Subject Japan은 쿠폰 발급처가 아니에요. 여권·매장 계정
                    정보를 수집하지 않으며, 저장 목록만 이 기기에 보관합니다.
                  </Label>
                </ScrollView>
              </View>
            </SafeAreaView>
          </SafeAreaProvider>
        ) : null}
      </Modal>
    </View>
  );
}
