import { useState } from "react";
import { View } from "react-native";
import { SubNav } from "../../ui/components";
import { MembershipScreen } from "../membership/MembershipScreen";
import type { MembershipCard } from "../membership/model";
import type { ExchangeRate } from "../pay/calculator";
import { CardScreen } from "./CardScreen";
import type { TransitCard } from "./model";

export function CardHub({
  cards,
  memberships,
  rate,
  onSave,
  onDelete,
  onSaveMembership,
  onDeleteMembership,
}: {
  cards: TransitCard[];
  memberships: MembershipCard[];
  rate: ExchangeRate | null;
  onSave: (card: TransitCard) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSaveMembership: (card: MembershipCard) => Promise<void>;
  onDeleteMembership: (id: string) => Promise<void>;
}) {
  const [section, setSection] = useState<"transit" | "membership">("transit");
  return (
    <View style={{ gap: 20 }}>
      <SubNav
        items={[
          { key: "transit", label: "교통카드", icon: "train-outline" },
          { key: "membership", label: "멤버십", icon: "barcode-outline" },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === "transit" ? (
        <CardScreen
          cards={cards}
          rate={rate}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : (
        <MembershipScreen
          cards={memberships}
          onSave={onSaveMembership}
          onDelete={onDeleteMembership}
        />
      )}
    </View>
  );
}
