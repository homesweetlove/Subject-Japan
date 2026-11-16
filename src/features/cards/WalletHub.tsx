import { View } from "react-native";
import type { LocalState } from "../../domain/models";
import { SubNav, type NavItem } from "../../ui/components";
import { CouponScreen } from "../coupons/CouponScreen";
import { NearbyScreen } from "../coupons/NearbyScreen";
import { GuideScreen } from "../guides/GuideScreen";
import { guestGuides } from "../guides/catalog";
import { MembershipScreen } from "../membership/MembershipScreen";
import type { MembershipCard } from "../membership/model";
import { CardScreen } from "./CardScreen";
import type { TransitCard } from "./model";

export type WalletSection =
  | "transit"
  | "membership"
  | "coupons"
  | "nearby"
  | "guest";
const sections: NavItem<WalletSection>[] = [
  { key: "transit", label: "교통카드", icon: "train-outline" },
  { key: "membership", label: "멤버십", icon: "barcode-outline" },
  { key: "coupons", label: "쿠폰·혜택", icon: "ticket-outline" },
  { key: "nearby", label: "주변 매장", icon: "location-outline" },
  { key: "guest", label: "게스트·VIP", icon: "star-outline" },
];

/** Everything the traveller shows at a till: cards, memberships, coupons. */
export function WalletHub({
  state,
  section,
  onSection,
  onSave,
  onDelete,
  onSaveMembership,
  onDeleteMembership,
  onToggleSaved,
  onToggleGuide,
}: {
  state: LocalState;
  /** Held by the app shell so the open section survives the profile page. */
  section: WalletSection;
  onSection: (section: WalletSection) => void;
  onSave: (card: TransitCard) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSaveMembership: (card: MembershipCard) => Promise<void>;
  onDeleteMembership: (id: string) => Promise<void>;
  onToggleSaved: (id: string) => Promise<void>;
  onToggleGuide: (id: string) => Promise<void>;
}) {
  return (
    <View style={{ gap: 20 }}>
      <SubNav items={sections} value={section} onChange={onSection} wrap />
      {section === "transit" ? (
        <CardScreen
          cards={state.transitCards}
          rate={state.exchangeRate}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : section === "membership" ? (
        <MembershipScreen
          cards={state.membershipCards}
          onSave={onSaveMembership}
          onDelete={onDeleteMembership}
        />
      ) : section === "coupons" ? (
        <CouponScreen
          savedIds={state.savedCouponIds}
          onToggleSaved={onToggleSaved}
        />
      ) : section === "nearby" ? (
        <NearbyScreen />
      ) : (
        <GuideScreen
          title="게스트·VIP 빠른 준비"
          subtitle="카드 발급 동선을 줄이고, 자격이 있는 VIP의 우선 수속 조건을 확인하세요."
          guides={guestGuides}
          checked={state.guideChecks}
          onToggle={onToggleGuide}
        />
      )}
    </View>
  );
}
