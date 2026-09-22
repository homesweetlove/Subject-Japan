import { useState } from "react";
import { View } from "react-native";
import type { LocalState } from "../../domain/models";
import { Choice } from "../../ui/Choice";
import { GuideScreen } from "../guides/GuideScreen";
import { guestGuides } from "../guides/catalog";
import { CouponScreen } from "./CouponScreen";
export function CouponHub({
  state,
  onToggleSaved,
  onToggleGuide,
}: {
  state: LocalState;
  onToggleSaved: (id: string) => Promise<void>;
  onToggleGuide: (id: string) => Promise<void>;
}) {
  const [section, setSection] = useState<"coupons" | "guest">("coupons");
  return (
    <View style={{ gap: 24 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="쿠폰·혜택"
          selected={section === "coupons"}
          onPress={() => setSection("coupons")}
        />
        <Choice
          label="게스트·VIP 패스트트랙"
          selected={section === "guest"}
          onPress={() => setSection("guest")}
        />
      </View>
      {section === "coupons" ? (
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
