import { useState } from "react";
import { View } from "react-native";
import type { LocalState } from "../../domain/models";
import { SubNav, type NavItem } from "../../ui/components";
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

export type TripSection =
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

export function TripScreen({
  state,
  onSaveReminder,
  onDeleteReminder,
  onToggleGuide,
  onSaveItem,
  onDeleteItem,
  onRestore,
  initialSection = "itinerary",
}: {
  state: LocalState;
  onSaveReminder: (r: AirportReminder) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  onToggleGuide: (id: string) => Promise<void>;
  onSaveItem: (item: TripItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onRestore?: (restored: LocalState) => Promise<void>;
  initialSection?: TripSection;
}) {
  const [section, setSection] = useState<TripSection>(initialSection);

  const krwRate = state.exchangeRate?.krwPer100Jpy ?? 900;

  return (
    <View style={{ gap: 22 }}>
      <SubNav items={sections} value={section} onChange={setSection} />

      {section === "itinerary" ? (
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
        <TransitScreen krwPer100Jpy={krwRate} />
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
