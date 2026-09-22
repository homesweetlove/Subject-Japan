import { useState } from "react";
import { View } from "react-native";
import type { LocalState } from "../../domain/models";
import { Choice } from "../../ui/Choice";
import { GuideScreen } from "../guides/GuideScreen";
import { ticketGuides } from "../guides/catalog";
import { AirportScreen } from "./AirportScreen";
import type { AirportReminder } from "./countdown";
export function TripScreen({
  state,
  onSaveReminder,
  onDeleteReminder,
  onToggleGuide,
}: {
  state: LocalState;
  onSaveReminder: (r: AirportReminder) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  onToggleGuide: (id: string) => Promise<void>;
}) {
  const [section, setSection] = useState<"airport" | "tickets">("airport");
  return (
    <View style={{ gap: 24 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="공항 막차"
          selected={section === "airport"}
          onPress={() => setSection("airport")}
        />
        <Choice
          label="공연 티켓팅"
          selected={section === "tickets"}
          onPress={() => setSection("tickets")}
        />
      </View>
      {section === "airport" ? (
        <AirportScreen
          reminders={state.airportReminders}
          onSave={onSaveReminder}
          onDelete={onDeleteReminder}
        />
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
