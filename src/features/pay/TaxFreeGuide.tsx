import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  Label,
  ScreenHeader,
  styles,
  type IconName,
} from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { Press } from "../../ui/Press";
import { ShowCard, type ShowCardContent } from "../../ui/ShowCard";
import { radius, useTheme } from "../../ui/theme";
import { openTravelLink } from "../guides/links";
import { japanDateTime, parseJapanDateTime } from "../trip/countdown";
import {
  recommendedArrival,
  shopRefundNotes,
  taxFreeAirports,
  type AirportId,
} from "./airportTaxFree";
import { REFUND_METHOD_START, REFUND_WINDOW_DAYS } from "./taxFreeTracker";

/*
 * Facts on this page follow the Japan Tourism Agency traveller page and
 * leaflet for the refund method (checked 2026-11-05). Refund fees, methods
 * and timing are set by each shop or refund company, so the page never
 * promises them.
 */

const comparison: { topic: string; before: string; after: string }[] = [
  {
    topic: "계산대",
    before: "세금을 뺀 가격으로 결제",
    after: "세금 포함 가격으로 결제하고 여권을 보여줘요",
  },
  {
    topic: "돌려받는 때",
    before: "계산대에서 바로 빠짐",
    after: "공항 세관 확인 뒤 카드·앱 등으로",
  },
  {
    topic: "공항",
    before: "세관이 가끔 확인",
    after: "짐 맡기기 전 세관 기계에서 꼭 확인",
  },
  {
    topic: "화장품·먹을거리",
    before: "밀봉 봉투, 50만 엔까지",
    after: "봉투·상한 없음. 그래도 일본에서 쓰면 안 돼요",
  },
];

const airportSteps: { title: string; detail: string }[] = [
  {
    title: "공항에 평소보다 일찍 도착",
    detail: "빨간불이 나오면 검사 시간이 더 걸려요. 늦어도 항공사·세관이 책임지지 않아요.",
  },
  {
    title: "짐 맡기기 전에 세관 기계에 여권 대기",
    detail: "출발 로비의 면세 절차 기계(키오스크)예요. 면세품은 전부 들고 있어야 해요.",
  },
  {
    title: "초록불이면 끝, 빨간불이면 세관 검사대로",
    detail: "빨간불이면 면세품을 직원에게 보여줘요. 검사를 중간에 그만두면 확인이 안 돼요.",
  },
  {
    title: "그다음 짐 맡기고 출국 심사",
    detail: "출국 심사를 지나면 출발 로비로 돌아갈 수 없어요.",
  },
];

const noRefund: { icon: IconName; text: string }[] = [
  {
    icon: "receipt-outline",
    text: "영수증 한 장의 물건 중 하나라도 없으면 그 영수증 전체가 안 돼요 (선물로 줬거나 잃어버린 경우 포함).",
  },
  {
    icon: "flask-outline",
    text: "일본에서 뜯어서 쓰거나 먹은 화장품·약·먹을거리. 이럴 땐 기계 대신 세관 직원에게 말해요.",
  },
  {
    icon: "briefcase-outline",
    text: "면세품을 먼저 짐으로 맡긴 경우. 빨간불이 나오면 다시 꺼내기 어려워요.",
  },
  {
    icon: "calendar-outline",
    text: `산 날부터 ${REFUND_WINDOW_DAYS}일이 지난 뒤 출국하는 경우.`,
  },
];

const rules: string[] = [
  "같은 매장에서 같은 날 세금 빼고 5,000엔 이상 사야 해요.",
  `산 날부터 ${REFUND_WINDOW_DAYS}일 안에 출국하면서 세관 확인을 받아야 해요.`,
  "출국할 때 들고 나갈 수 있는 양만 면세로 살 수 있어요.",
  "금·백금 덩어리처럼 원래 세금이 없는 물건은 빠져요.",
  "일본 국내선으로 갈아타고 나가면, 일본을 마지막으로 떠나는 공항에서 확인해요.",
  "나리타·하네다·간사이·주부·후쿠오카·신치토세·나하 공항은 비짓 재팬 웹으로도 확인할 수 있어요 (보안 검색대 앞까지).",
];

const phrases: (ShowCardContent & { key: string; korean: string })[] = [
  {
    key: "ask",
    japanese: "免税手続きはできますか？",
    reading: "멘제- 테츠즈키와 데키마스카?",
    korean: "면세 절차 할 수 있나요?",
  },
  {
    key: "card",
    japanese: "返金はクレジットカードでお願いします。",
    reading: "헨킨와 쿠레짓토카-도데 오네가이시마스.",
    korean: "환급은 신용카드로 부탁해요.",
  },
  {
    key: "fee",
    japanese: "返金の手数料はかかりますか？",
    reading: "헨킨노 테스-료-와 카카리마스카?",
    korean: "환급 수수료가 드나요?",
  },
  {
    key: "where",
    japanese: "税関の免税手続きはどこですか？",
    reading: "제-칸노 멘제- 테츠즈키와 도코데스카?",
    korean: "(공항에서) 세관 면세 절차는 어디서 하나요?",
  },
];

const links: { label: string; url: string }[] = [
  {
    label: "일본 세관 한국어 안내 (PDF)",
    url: "https://www.customs.go.jp/kaigairyoko/taxrefund/refund_korea.pdf",
  },
  {
    label: "일본정부관광국 한국어 안내",
    url: "https://www.japan.travel/ko/kr/topic/2026nyeon-11weol-1ilbuteo-sobise-myeonse-jedoga-byeongyeongdoebnida/",
  },
  {
    label: "일본 관광청 공식 안내 (일본어)",
    url: "https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00021.html",
  },
];

export function TaxFreeGuide({
  onOpenTracker,
  waitingReceipts = 0,
}: {
  onOpenTracker: () => void;
  /** Receipts still waiting for the customs check, from the tracker. */
  waitingReceipts?: number;
}) {
  const c = useTheme();
  const [phrase, setPhrase] = useState<ShowCardContent | null>(null);
  const [linkError, setLinkError] = useState("");
  const started = Date.now() >= REFUND_METHOD_START;
  return (
    <View style={{ gap: 22 }}>
      <ScreenHeader
        seal="税"
        title="면세는 이제 출국할 때 돌려받아요"
        subtitle="2026년 11월 1일에 산 물건부터예요. 매장에서는 세금까지 다 내고, 일본을 떠날 때 공항 세관 확인을 받으면 그 세금을 돌려받아요."
      />
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          backgroundColor: c.accentSoft,
          borderRadius: radius.md,
          padding: 14,
        }}
      >
        <Icon name="wallet-outline" color={c.accentInk} />
        <Label size={14} weight="600" style={{ color: c.accentInk, flex: 1 }}>
          {started
            ? "지금은 새 방식만 있어요. 쇼핑 예산을 세금(10%)만큼 더 잡아 두세요."
            : "11월 1일 구매분부터 새 방식이에요. 그 전 구매는 계산대에서 바로 세금이 빠져요."}
        </Label>
      </View>

      <Journey />

      <AirportPlanner
        waitingReceipts={waitingReceipts}
        onLinkError={setLinkError}
      />

      <Card>
        <Label weight="700" size={17}>
          무엇이 달라졌나요
        </Label>
        <View style={{ gap: 0 }}>
          <View style={[styles.row, { paddingBottom: 8 }]}>
            <View style={{ width: 84 }} />
            <Label muted size={12} weight="700" style={{ flex: 1 }}>
              10월 31일까지
            </Label>
            <Label size={12} weight="700" style={{ flex: 1, color: c.accent }}>
              11월 1일부터
            </Label>
          </View>
          {comparison.map((row) => (
            <View
              key={row.topic}
              style={[
                styles.row,
                {
                  alignItems: "flex-start",
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderColor: c.line,
                },
              ]}
            >
              <Label size={13} weight="700" style={{ width: 84 }}>
                {row.topic}
              </Label>
              <Label muted size={13} style={{ flex: 1 }}>
                {row.before}
              </Label>
              <Label size={13} style={{ flex: 1 }}>
                {row.after}
              </Label>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Label weight="700" size={17}>
          공항에서는 이 순서로
        </Label>
        {airportSteps.map((step, index) => (
          <View
            key={step.title}
            style={[styles.row, { alignItems: "flex-start", gap: 12 }]}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: index === 1 ? c.accent : c.soft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: index === 1 ? c.inverse : c.ink,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                {index + 1}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={15} weight="700">
                {step.title}
              </Label>
              <Label muted size={13}>
                {step.detail}
              </Label>
            </View>
          </View>
        ))}
      </Card>

      <Card tone="muted">
        <Label weight="700" size={17}>
          이럴 땐 돌려받지 못해요
        </Label>
        {noRefund.map((item) => (
          <View
            key={item.text}
            style={[styles.row, { alignItems: "flex-start", gap: 12 }]}
          >
            <Icon name={item.icon} size={20} color={c.error} />
            <Label size={14} style={{ flex: 1 }}>
              {item.text}
            </Label>
          </View>
        ))}
      </Card>

      <Card>
        <Label weight="700" size={17}>
          알아둘 조건
        </Label>
        {rules.map((rule) => (
          <View
            key={rule}
            style={[styles.row, { alignItems: "flex-start", gap: 10 }]}
          >
            <Icon name="checkmark" size={18} color={c.success} />
            <Label size={14} style={{ flex: 1 }}>
              {rule}
            </Label>
          </View>
        ))}
        <Label muted size={12}>
          환급 방법(카드·앱·현금), 걸리는 시간, 수수료는 매장이나 환급 업체마다
          달라요. 결제할 때 물어보세요. 공항에서 현금으로 받으면 수수료가 붙는
          곳이 있어요.
        </Label>
      </Card>

      <Card>
        <Label weight="700" size={17}>
          매장별 환급 방법
        </Label>
        {shopRefundNotes.map((item) => (
          <View key={item.shop} style={{ gap: 2 }}>
            <Label size={15} weight="700">
              {item.shop}
            </Label>
            <Label size={14}>{item.note}</Label>
            <Label muted size={12}>
              {item.checkedOn} 확인
            </Label>
          </View>
        ))}
        <Label muted size={12}>
          매장이 직접 발표한 내용만 적었어요. 계산할 때 "환급 방법, 걸리는 기간,
          수수료" 세 가지를 물어보세요. 아래 일본어 문장을 보여줘도 돼요.
        </Label>
      </Card>

      <Card>
        <Label weight="700" size={17}>
          직원에게 보여주기
        </Label>
        <View style={{ gap: 8 }}>
          {phrases.map((p) => (
            <Press
              key={p.key}
              accessibilityRole="button"
              accessibilityLabel={`${p.korean} 크게 보기`}
              onPress={() => setPhrase(p)}
              style={({ pressed }) => ({
                borderRadius: radius.md,
                padding: 14,
                gap: 4,
                backgroundColor: pressed ? c.softPressed : c.soft,
              })}
            >
              <View style={styles.between}>
                <Label size={13} muted style={{ flex: 1 }}>
                  {p.korean}
                </Label>
                <Icon name="expand-outline" size={16} color={c.muted} />
              </View>
              <Label size={17} weight="700">
                {p.japanese}
              </Label>
            </Press>
          ))}
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <Button
          label="내 면세 영수증 기록하기"
          icon="receipt-outline"
          primary
          onPress={onOpenTracker}
        />
        {links.map((link) => (
          <Button
            key={link.url}
            label={link.label}
            icon="open-outline"
            variant="ghost"
            onPress={() => {
              setLinkError("");
              void openTravelLink(link.url).catch((e: Error) =>
                setLinkError(e.message),
              );
            }}
          />
        ))}
        {!!linkError && (
          <Text accessibilityRole="alert" style={{ color: c.error }}>
            {linkError}
          </Text>
        )}
        <Label muted size={12}>
          2026년 11월 5일에 일본 관광청 안내로 확인한 내용이에요. 제도는 바뀔 수
          있으니 출국 전에 공식 안내를 한 번 더 보세요.
        </Label>
      </View>

      <ShowCard
        heading="매장·공항 직원에게 보여주세요"
        content={phrase}
        onClose={() => setPhrase(null)}
      />
    </View>
  );
}

/**
 * The three stops of the refund method, drawn with the app's own shapes
 * so they work offline and in dark mode. A dashed route joins the panels
 * like a travel ticket.
 */
function Journey() {
  return (
    <View accessibilityRole="summary" style={{ gap: 0 }}>
      <Stop
        step="매장"
        title="세금까지 다 내고, 여권을 보여줘요"
        detail="이때 환급받을 방법(카드 등)을 등록해요."
        art={<ShopArt />}
      />
      <Route />
      <Stop
        step="공항"
        title="짐 맡기기 전, 세관 기계에 여권을"
        detail="초록불이면 끝. 빨간불이면 물건을 보여줘요."
        art={<KioskArt />}
      />
      <Route />
      <Stop
        step="돌려받기"
        title="확인이 끝나면 세금이 돌아와요"
        detail="등록한 카드·앱 등으로 들어와요."
        art={<RefundArt />}
      />
    </View>
  );
}

function Stop({
  step,
  title,
  detail,
  art,
}: {
  step: string;
  title: string;
  detail: string;
  art: ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${step}: ${title} ${detail}`}
      style={{
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.line,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 112,
          height: 104,
          borderRadius: radius.md,
          backgroundColor: c.soft,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {art}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Label size={12} weight="800" style={{ color: c.accent }}>
          {step}
        </Label>
        <Label size={16} weight="700">
          {title}
        </Label>
        <Label muted size={13}>
          {detail}
        </Label>
      </View>
    </View>
  );
}

function Route() {
  const c = useTheme();
  return (
    <View
      style={{ height: 22, marginLeft: 70, justifyContent: "center" }}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <View
        style={{
          width: 0,
          height: 22,
          borderLeftWidth: 2,
          borderStyle: "dashed",
          borderColor: c.accent,
        }}
      />
    </View>
  );
}

/** A price tag with the tax still inside it, a card and a passport. */
function ShopArt() {
  const c = useTheme();
  return (
    <View style={{ width: 96, height: 84 }}>
      <View
        style={{
          position: "absolute",
          left: 6,
          top: 8,
          width: 70,
          height: 46,
          borderRadius: 8,
          backgroundColor: c.surface,
          borderWidth: 1.5,
          borderColor: c.ink,
          paddingLeft: 16,
          justifyContent: "center",
          transform: [{ rotate: "-6deg" }],
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 5,
            top: 18,
            width: 6,
            height: 6,
            borderRadius: 3,
            borderWidth: 1.5,
            borderColor: c.ink,
          }}
        />
        <Text style={{ color: c.ink, fontWeight: "800", fontSize: 13 }}>
          ¥11,000
        </Text>
        <Text style={{ color: c.accent, fontWeight: "700", fontSize: 9 }}>
          세금 ¥1,000 포함
        </Text>
      </View>
      <View
        style={{
          position: "absolute",
          right: 2,
          bottom: 2,
          width: 46,
          height: 30,
          borderRadius: 6,
          backgroundColor: c.ink,
          padding: 5,
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            width: 12,
            height: 8,
            borderRadius: 2,
            backgroundColor: c.accent,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: 10,
          bottom: 0,
          width: 26,
          height: 34,
          borderRadius: 4,
          backgroundColor: c.accentInk,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: c.inverse,
          }}
        />
      </View>
    </View>
  );
}

/** The customs kiosk: passport slot and the green / red result lamps. */
function KioskArt() {
  const c = useTheme();
  return (
    <View style={{ width: 96, height: 92, alignItems: "center" }}>
      <View
        style={{
          width: 62,
          height: 50,
          borderRadius: 8,
          backgroundColor: c.ink,
          padding: 6,
          gap: 4,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 4,
            backgroundColor: c.surface,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
          }}
        >
          <Lamp color={c.success} label="통과" />
          <Lamp color={c.error} label="검사" />
        </View>
      </View>
      <View style={{ width: 14, height: 22, backgroundColor: c.ink }} />
      <View
        style={{
          width: 48,
          height: 6,
          borderRadius: 3,
          backgroundColor: c.ink,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 4,
          alignItems: "center",
        }}
      >
        <Icon name="briefcase" size={26} color={c.muted} />
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: c.error,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: c.inverse, fontSize: 9, fontWeight: "900" }}>
            ✕
          </Text>
        </View>
      </View>
    </View>
  );
}

function Lamp({ color, label }: { color: string; label: string }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 1 }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
        }}
      />
      <Text style={{ color: c.ink, fontSize: 8, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

/** The tax coming back to the card that was registered at the shop. */
function RefundArt() {
  const c = useTheme();
  return (
    <View style={{ width: 96, height: 84 }}>
      <View
        style={{
          position: "absolute",
          left: 4,
          bottom: 6,
          width: 60,
          height: 38,
          borderRadius: 7,
          backgroundColor: c.ink,
          padding: 6,
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            width: 14,
            height: 9,
            borderRadius: 2,
            backgroundColor: c.accent,
          }}
        />
        <View
          style={{
            width: 34,
            height: 3,
            borderRadius: 2,
            backgroundColor: c.muted,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          right: 2,
          top: 4,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: c.successSoft,
          borderWidth: 2,
          borderColor: c.success,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: c.success, fontWeight: "800", fontSize: 11 }}>
          +¥1,000
        </Text>
      </View>
      <View style={{ position: "absolute", left: 46, top: 18 }}>
        <Icon name="arrow-undo" size={22} color={c.success} />
      </View>
    </View>
  );
}

/**
 * Pick the departure airport: where its customs kiosks are, whether it
 * has a cash refund machine, its official pages, and when to arrive.
 */
function AirportPlanner({
  waitingReceipts,
  onLinkError,
}: {
  waitingReceipts: number;
  onLinkError: (message: string) => void;
}) {
  const c = useTheme();
  const [airportId, setAirportId] = useState<AirportId>("kix");
  const airport = taxFreeAirports.find((a) => a.id === airportId)!;
  const [date, setDate] = useState(() =>
    japanDateTime(Date.now()).slice(0, 10),
  );
  const [time, setTime] = useState("");
  const [receipts, setReceipts] = useState(String(waitingReceipts));
  const [holiday, setHoliday] = useState(false);
  let plan: ReturnType<typeof recommendedArrival> | null = null;
  let planError = "";
  if (time.trim()) {
    try {
      plan = recommendedArrival({
        departure: parseJapanDateTime(date.trim(), time.trim()),
        receipts: Number(receipts) || 0,
        holiday,
      });
    } catch (e) {
      planError = e instanceof Error ? e.message : "시각을 확인해 주세요.";
    }
  }
  const open = (url: string) => {
    onLinkError("");
    void openTravelLink(url).catch((e: Error) => onLinkError(e.message));
  };
  return (
    <Card>
      <Label weight="700" size={17}>
        내가 떠나는 공항
      </Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {taxFreeAirports.map((a) => (
          <Choice
            key={a.id}
            label={a.name}
            selected={a.id === airportId}
            onPress={() => setAirportId(a.id)}
          />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Label size={14} weight="700">
          세관 면세 기계 위치
        </Label>
        {airport.kiosk.map((line) => (
          <View
            key={line}
            style={[styles.row, { alignItems: "flex-start", gap: 10 }]}
          >
            <Icon name="location-outline" size={18} color={c.accent} />
            <Label size={14} style={{ flex: 1 }}>
              {line}
            </Label>
          </View>
        ))}
        {airport.cashRefund ? (
          <View style={[styles.row, { alignItems: "flex-start", gap: 10 }]}>
            <Icon name="cash-outline" size={18} color={c.success} />
            <Label size={14} style={{ flex: 1 }}>
              {airport.cashRefund}
            </Label>
          </View>
        ) : null}
        {airport.visitJapanWeb ? (
          <Label muted size={12}>
            이 공항은 출발 로비 전용 와이파이에서 비짓 재팬 웹으로도 세관 확인을
            할 수 있어요.
          </Label>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        {airport.liveWaitUrl ? (
          <Button
            label="보안검사 실시간 대기 시간 보기 (공식)"
            icon="time-outline"
            onPress={() => open(airport.liveWaitUrl!)}
          />
        ) : null}
        {airport.guideUrl ? (
          <Button
            label={`${airport.name} 공항 출발 안내 열기`}
            icon="open-outline"
            variant="ghost"
            onPress={() => open(airport.guideUrl!)}
          />
        ) : null}
        <Label muted size={12}>
          세관 면세 기계 줄은 어느 공항도 실시간으로 공개하지 않아요.
          {airport.liveWaitUrl
            ? " 보안검사 대기 시간은 공항이 공식 페이지에 올려요."
            : " 이 공항의 실시간 대기 시간은 공항 안 안내 화면으로 확인하세요."}
        </Label>
      </View>

      <View
        style={{
          gap: 10,
          borderTopWidth: 1,
          borderColor: c.line,
          paddingTop: 16,
        }}
      >
        <Label size={15} weight="700">
          몇 시까지 공항에 가야 할까
        </Label>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="출발 날짜 (YYYY-MM-DD)"
              value={date}
              onChange={setDate}
              maxLength={10}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="비행기 출발 (HH:mm)"
              value={time}
              onChange={setTime}
              maxLength={5}
              placeholder="예: 14:30"
            />
          </View>
        </View>
        <Field
          label="세관 확인할 면세 영수증 수"
          value={receipts}
          onChange={setReceipts}
          numeric
          maxLength={3}
        />
        <Choice
          label="연휴·성수기에 떠나요"
          checkbox
          selected={holiday}
          onPress={() => setHoliday(!holiday)}
        />
        {planError ? (
          <Text accessibilityRole="alert" style={{ color: c.error }}>
            {planError}
          </Text>
        ) : null}
        {plan ? (
          <View
            style={{
              backgroundColor: c.accentSoft,
              borderRadius: radius.md,
              padding: 14,
              gap: 6,
            }}
          >
            <Label size={13} style={{ color: c.accentInk }} weight="700">
              늦어도 이때까지 공항 도착
            </Label>
            <Text
              style={{
                color: c.ink,
                fontSize: 30,
                fontWeight: "800",
                fontVariant: ["tabular-nums"],
              }}
            >
              {japanDateTime(plan.arriveAt).slice(0, 10) === date.trim()
                ? japanDateTime(plan.arriveAt).slice(11)
                : japanDateTime(plan.arriveAt)}
            </Text>
            <Label size={13}>
              출발 {Math.floor(plan.minutes / 60)}시간
              {plan.minutes % 60 ? ` ${plan.minutes % 60}분` : ""} 전 (일본 시각)
            </Label>
            {plan.parts.map((part) => (
              <Label key={part.label} muted size={12}>
                {part.label} +{part.minutes}분
              </Label>
            ))}
          </View>
        ) : null}
        <Label muted size={12}>
          앱이 어림한 시간이에요. 항공사 체크인 마감 시각이 더 이르면 그쪽을
          따르세요. 세관 확인 때문에 비행기를 놓쳐도 항공사·세관이 책임지지
          않아요.
        </Label>
      </View>
    </Card>
  );
}
