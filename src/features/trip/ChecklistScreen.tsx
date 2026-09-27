import { useState } from "react";
import { View } from "react-native";
import type { Profile } from "../../domain/models";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { useTheme } from "../../ui/theme";
import { travelChecklistItems, type ChecklistItem } from "./checklist";

export function ChecklistScreen({
  profile,
  checked,
  onToggle,
}: {
  profile: Profile;
  checked: string[];
  onToggle: (id: string) => Promise<void>;
}) {
  const c = useTheme();
  const [category, setCategory] = useState<
    "all" | "prep" | "drugstore" | "donki" | "fashion"
  >("all");
  const [busy, setBusy] = useState(false);

  const filtered = travelChecklistItems.filter(
    (item) => category === "all" || item.category === category,
  );

  const completedCount = travelChecklistItems.filter((i) =>
    checked.includes(i.id),
  ).length;

  const toggle = async (id: string) => {
    setBusy(true);
    try {
      await onToggle(id);
    } finally {
      setBusy(false);
    }
  };

  const hasSizes =
    profile.sizes.top || profile.sizes.bottom || profile.sizes.shoe;

  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        eyebrow="TRAVEL SHOPPING & PACKING"
        title="쇼핑 & 필수 준비물 체크"
        subtitle="드럭스토어, 돈키호테 인기템, 110V 전압 주의사항과 내 사이즈를 한눈에 확인하세요."
      />

      {/* Profile quick sizes card */}
      <Card>
        <View style={styles.between}>
          <Label weight="700">내 체형 사이즈 퀵뷰</Label>
          <Label muted size={12}>
            {profile.nickname || "등록된 닉네임 없음"}
          </Label>
        </View>
        {hasSizes ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {profile.sizes.top ? (
              <View
                style={{
                  backgroundColor: c.soft,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Label size={12} muted>
                  상의
                </Label>
                <Label weight="700">{profile.sizes.top}</Label>
              </View>
            ) : null}
            {profile.sizes.bottom ? (
              <View
                style={{
                  backgroundColor: c.soft,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Label size={12} muted>
                  하의
                </Label>
                <Label weight="700">{profile.sizes.bottom}</Label>
              </View>
            ) : null}
            {profile.sizes.shoe ? (
              <View
                style={{
                  backgroundColor: c.soft,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Label size={12} muted>
                  신발
                </Label>
                <Label weight="700">{profile.sizes.shoe}</Label>
              </View>
            ) : null}
          </View>
        ) : (
          <Label muted size={13}>
            프로필 페이지에서 내 사이즈를 등록하면 쇼핑할 때 편리하게 확인할 수
            있어요.
          </Label>
        )}
      </Card>

      {/* Progress header */}
      <View style={styles.between}>
        <Label weight="700">
          준비 현황: {completedCount} / {travelChecklistItems.length} 완료
        </Label>
        <Label muted size={13}>
          {Math.round((completedCount / travelChecklistItems.length) * 100)}%
        </Label>
      </View>

      {/* Categories */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="전체"
          selected={category === "all"}
          onPress={() => setCategory("all")}
        />
        <Choice
          label="출국 준비·전기"
          selected={category === "prep"}
          onPress={() => setCategory("prep")}
        />
        <Choice
          label="드럭스토어"
          selected={category === "drugstore"}
          onPress={() => setCategory("drugstore")}
        />
        <Choice
          label="돈키호테"
          selected={category === "donki"}
          onPress={() => setCategory("donki")}
        />
        <Choice
          label="패션·의류"
          selected={category === "fashion"}
          onPress={() => setCategory("fashion")}
        />
      </View>

      {/* Items list */}
      <View style={{ gap: 12 }}>
        {filtered.map((item) => {
          const isDone = checked.includes(item.id);
          return (
            <Card key={item.id}>
              <View style={styles.between}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Label
                    weight="700"
                    size={16}
                    style={{
                      textDecorationLine: isDone ? "line-through" : "none",
                      opacity: isDone ? 0.6 : 1,
                    }}
                  >
                    {item.title}
                  </Label>
                  {item.jpName ? (
                    <Label muted size={12}>
                      {item.jpName}
                    </Label>
                  ) : null}
                </View>
                <Choice
                  label={isDone ? "완료" : "체크"}
                  checkbox
                  selected={isDone}
                  disabled={busy}
                  onPress={() => void toggle(item.id)}
                />
              </View>
              <Label muted size={13}>
                {item.description}
              </Label>
            </Card>
          );
        })}
      </View>
    </View>
  );
}
