import { useState } from "react";
import { View } from "react-native";
import type { LocalState } from "../../domain/models";
import { SubNav } from "../../ui/components";
import { GuideScreen } from "../guides/GuideScreen";
import { guestGuides } from "../guides/catalog";
import { CouponScreen } from "./CouponScreen";
import { NearbyScreen } from "./NearbyScreen";
export function CouponHub({
  state,
  onToggleSaved,
  onToggleGuide,
}: {
  state: LocalState;
  onToggleSaved: (id: string) => Promise<void>;
  onToggleGuide: (id: string) => Promise<void>;
}) {
  const [section, setSection] = useState<"coupons" | "guest" | "nearby">(
    "coupons",
  );
  return (
    <View style={{ gap: 22 }}>
      <SubNav
        items={[
          { key: "coupons", label: "쿠폰·혜택", icon: "ticket-outline" },
          { key: "nearby", label: "주변 매장", icon: "location-outline" },
          { key: "guest", label: "게스트·VIP", icon: "star-outline" },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === "nearby" ? (
        <NearbyScreen />
      ) : section === "coupons" ? (
        <CouponScreen
          savedIds={state.savedCouponIds}
          onToggleSaved={onToggleSaved}
        />
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
