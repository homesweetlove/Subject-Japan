import { useState } from "react";
import { TextInput, View } from "react-native";
import type { LocalState } from "../../domain/models";
import {
  Button,
  Icon,
  Label,
  ScreenHeader,
  SubNav,
  type NavItem,
} from "../../ui/components";
import { Press } from "../../ui/Press";
import { useTheme } from "../../ui/theme";
import { GuideScreen } from "../guides/GuideScreen";
import { ticketGuides } from "../guides/catalog";
import { AirportScreen } from "./AirportScreen";
import type { AirportReminder } from "./countdown";
import type { TripItem } from "./itinerary";
import { ItineraryScreen } from "./ItineraryScreen";
import { EmergencyScreen } from "./EmergencyScreen";
import { ChecklistScreen } from "./ChecklistScreen";
import { DiningScreen } from "./DiningScreen";
import { TransitScreen } from "./TransitScreen";
import { EtiquetteScreen } from "./EtiquetteScreen";
import { DigitalUtilitiesScreen } from "./DigitalUtilitiesScreen";
import { GoScreen } from "./GoScreen";

export type TripSection =
  | "go"
  | "itinerary"
  | "airport"
  | "dining"
  | "transit"
  | "checklist"
  | "emergency"
  | "etiquette"
  | "digital"
  | "tickets";
const sections: NavItem<TripSection>[] = [
  { key: "go", label: "길찾기·택시·운행", icon: "navigate-outline" },
  { key: "itinerary", label: "일정·예약", icon: "calendar-outline" },
  { key: "airport", label: "공항 막차", icon: "airplane-outline" },
  { key: "dining", label: "식당 주문·알레르기", icon: "restaurant-outline" },
  { key: "transit", label: "교통·패스 비교", icon: "train-outline" },
  { key: "checklist", label: "쇼핑·체크리스트", icon: "bag-check-outline" },
  { key: "emergency", label: "긴급 SOS", icon: "medkit-outline" },
  { key: "etiquette", label: "문화 & 매너", icon: "leaf-outline" },
  { key: "digital", label: "디지털 & 백업", icon: "phone-portrait-outline" },
  { key: "tickets", label: "공연 티켓팅", icon: "musical-notes-outline" },
];

/** The menu groups tools by the moment they are needed, not by type. */
const groups: { title: string; keys: TripSection[] }[] = [
  { title: "급할 때", keys: ["emergency"] },
  { title: "이동할 때", keys: ["go", "transit", "airport"] },
  { title: "먹을 때", keys: ["dining"] },
  { title: "준비할 것", keys: ["itinerary", "checklist", "tickets"] },
  { title: "알아 두기", keys: ["etiquette", "digital"] },
];
/** One-line hint under each menu row; also what the search box matches. */
const hints: Record<TripSection, string> = {
  go: "지도, 우버, 일본어 목적지 카드, 열차 운행 정보",
  itinerary: "호텔 체크인, 예약, 메모",
  airport: "공항 가는 막차 시각과 알림",
  dining: "주문 문장, 알레르기, 자릿세, 라멘 주문표",
  transit: "교통패스 손익, 신칸센 짐, 택시 요금",
  checklist: "살 것과 챙길 짐 목록",
  emergency: "경찰, 구급차, 영사관, 보여주는 문장",
  etiquette: "온천, 신사, 쓰레기 버리기, 료칸",
  digital: "전압, 인터넷, 입국 준비, 내 자료 백업",
  tickets: "콘서트 표 구하기 전 확인할 것",
};

export function TripScreen({
  state,
  onSaveReminder,
  onDeleteReminder,
  onToggleGuide,
  onSaveItem,
  onDeleteItem,
  onRestore,
  initialSection = null,
}: {
  state: LocalState;
  onSaveReminder: (r: AirportReminder) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  onToggleGuide: (id: string) => Promise<void>;
  onSaveItem: (item: TripItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onRestore?: (restored: LocalState) => Promise<void>;
  /** `null` opens the grouped menu; a section opens that tool directly. */
  initialSection?: TripSection | null;
}) {
  const c = useTheme();
  const [section, setSection] = useState<TripSection | null>(initialSection);
  const [query, setQuery] = useState("");
  const [transitTab, setTransitTab] = useState<"passes" | "taxi">("passes");

  // No guessed fallback: screens hide won amounts until a real rate exists.
  const krwRate = state.exchangeRate?.krwPer100Jpy;

  if (section === null) {
    const needle = query.trim().toLocaleLowerCase();
    const matches = (key: TripSection) => {
      if (!needle) return true;
      const label = sections.find((s) => s.key === key)?.label ?? "";
      return `${label} ${hints[key]}`.toLocaleLowerCase().includes(needle);
    };
    const shown = groups
      .map((g) => ({ ...g, keys: g.keys.filter(matches) }))
      .filter((g) => g.keys.length > 0);
    return (
      <View style={{ gap: 18 }}>
        <ScreenHeader
          title="여행 도구"
          subtitle="필요한 순간별로 모았어요."
        />
        <TextInput
          accessibilityLabel="여행 기능 찾기"
          placeholder="찾는 기능을 적어 보세요"
          placeholderTextColor={c.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          style={{
            color: c.ink,
            backgroundColor: c.soft,
            borderRadius: 14,
            padding: 15,
            fontSize: 16,
          }}
        />
        {shown.length === 0 && (
          <Label muted>찾는 기능이 없어요. 다른 말로 적어 보세요.</Label>
        )}
        {shown.map((group) => (
          <View key={group.title}>
            <Label muted size={14} weight="600">
              {group.title}
            </Label>
            {group.keys.map((key, index) => {
              const item = sections.find((s) => s.key === key)!;
              return (
                <Press
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => setSection(key)}
                  style={{
                    minHeight: 60,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 10,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderColor: c.line,
                  }}
                >
                  <Icon
                    name={item.icon ?? "ellipse-outline"}
                    size={22}
                    color={key === "emergency" ? c.error : c.accent}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Label size={16} weight="600">
                      {item.label}
                    </Label>
                    <Label muted size={13}>
                      {hints[key]}
                    </Label>
                  </View>
                  <Icon name="chevron-forward" size={18} color={c.muted} />
                </Press>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 12 }}>
        <Button
          label="여행 도구 전체 보기"
          icon="chevron-back"
          variant="ghost"
          size="sm"
          onPress={() => setSection(null)}
          style={{ alignSelf: "flex-start" }}
        />
        <SubNav items={sections} value={section} onChange={setSection} />
      </View>

      {section === "go" ? (
        <GoScreen
          tripItems={state.tripItems}
          departure={state.departure}
          onOpenTaxiFare={() => {
            setTransitTab("taxi");
            setSection("transit");
          }}
        />
      ) : section === "itinerary" ? (
        <ItineraryScreen
          items={state.tripItems}
          onSave={onSaveItem}
          onDelete={onDeleteItem}
        />
      ) : section === "airport" ? (
        <AirportScreen
          reminders={state.airportReminders}
          onSave={onSaveReminder}
          onDelete={onDeleteReminder}
        />
      ) : section === "dining" ? (
        <DiningScreen krwPer100Jpy={krwRate} />
      ) : section === "transit" ? (
        <TransitScreen
          key={transitTab}
          krwPer100Jpy={krwRate}
          initialTab={transitTab}
        />
      ) : section === "checklist" ? (
        <ChecklistScreen
          profile={state.profile}
          checked={state.guideChecks}
          onToggle={onToggleGuide}
        />
      ) : section === "emergency" ? (
        <EmergencyScreen />
      ) : section === "etiquette" ? (
        <EtiquetteScreen />
      ) : section === "digital" ? (
        <DigitalUtilitiesScreen state={state} onRestore={onRestore} />
      ) : (
        <GuideScreen
          title="공연 티켓팅 서바이벌"
          subtitle="J-pop부터 현지 라이브까지. 구매 전에 알아야 할 것들을 챙기세요."
          guides={ticketGuides}
          checked={state.guideChecks}
          onToggle={onToggleGuide}
        />
      )}
    </View>
  );
}
