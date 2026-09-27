import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  initialState,
  type LocalState,
  type Profile,
  type SizeKey,
  type ThemePreference,
} from "../../domain/models";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Label,
  ScreenHeader,
  styles,
} from "../../ui/components";
import { useTheme } from "../../ui/theme";
import { estimateJapanSize } from "./sizeConversion";

const fields: { key: SizeKey; title: string; hint: string }[] = [
  { key: "top", title: "상의", hint: "예: 44, M, 95" },
  { key: "bottom", title: "하의", hint: "예: S, 28 inch" },
  { key: "shoe", title: "신발", hint: "예: 24 cm (일본 표기)" },
];
export function ProfileScreen({
  state,
  onSave,
  onClose,
  onReset,
}: {
  state: LocalState;
  onSave: (profile: Profile, theme: ThemePreference) => Promise<void>;
  onClose: () => void;
  onReset: (state: LocalState) => Promise<void>;
}) {
  const c = useTheme();
  const [profile, setProfile] = useState(state.profile);
  const [theme, setTheme] = useState(state.theme);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(
        {
          nickname: profile.nickname.trim(),
          sizes: Object.fromEntries(
            Object.entries(profile.sizes).map(([k, v]) => [k, v.trim()]),
          ) as Profile["sizes"],
        },
        theme,
      );
    } catch {
      setError("저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={{ gap: 24 }}>
      <ScreenHeader
        eyebrow={state.onboarded ? "MY PROFILE" : "WELCOME TO JAPAN"}
        title={
          state.onboarded ? "나에게 맞춘 여행" : "여행의 시작,\n나에게 맞게."
        }
        subtitle="사이즈를 한 번 저장하면, 쇼핑할 때 일본어 문장에 바로 담아 드려요."
        trailing={
          state.onboarded ? (
            <IconButton name="close" label="닫기" onPress={onClose} />
          ) : undefined
        }
      />
      <Card>
        <Label weight="600">어떻게 불러 드릴까요?</Label>
        <TextInput
          accessibilityLabel="닉네임"
          value={profile.nickname}
          onChangeText={(nickname) => setProfile((p) => ({ ...p, nickname }))}
          placeholder="닉네임 (선택)"
          placeholderTextColor={c.muted}
          maxLength={24}
          style={{
            color: c.ink,
            backgroundColor: c.soft,
            borderRadius: 14,
            padding: 15,
            fontSize: 16,
          }}
        />
      </Card>
      <Card>
        <View style={styles.row}>
          <Icon name="shirt-outline" />
          <Label weight="700" size={18}>
            내 옷 사이즈
          </Label>
        </View>
        <Label muted size={13}>
          모두 선택 사항이에요. 평소 쓰는 표기와 단위를 함께 적어 주세요.
        </Label>
        {fields.map((field) => (
          <View key={field.key} style={{ gap: 8 }}>
            <Label size={14} weight="600">
              {field.title}
            </Label>
            <TextInput
              accessibilityLabel={`${field.title} 사이즈`}
              placeholder={field.hint}
              placeholderTextColor={c.muted}
              maxLength={24}
              value={profile.sizes[field.key]}
              onChangeText={(value) =>
                setProfile((p) => ({
                  ...p,
                  sizes: { ...p.sizes, [field.key]: value },
                }))
              }
              style={{
                color: c.ink,
                backgroundColor: c.soft,
                borderRadius: 14,
                padding: 15,
                fontSize: 16,
              }}
            />
            {estimateJapanSize(field.key, profile.sizes[field.key]) ? (
              <View
                style={{
                  gap: 3,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderRadius: 13,
                  backgroundColor: c.accentSoft,
                }}
              >
                <Label size={11} weight="700" style={{ color: c.accent }}>
                  일본 쇼핑용 예상
                </Label>
                <Label size={15} weight="700">
                  {estimateJapanSize(field.key, profile.sizes[field.key])!.display}
                </Label>
                <Label size={11} muted>
                  {estimateJapanSize(field.key, profile.sizes[field.key])!.note}
                </Label>
              </View>
            ) : null}
          </View>
        ))}
        <Label size={12} muted>
          입력값은 그대로 저장하고 일본 쇼핑용 예상 표기를 함께 보여드려요.
          의류는 브랜드별 실측 차이가 있으니 매장 표와 최종 확인해 주세요.
        </Label>
      </Card>
      <Card>
        <Label weight="600">화면 스타일</Label>
        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: "row",
            gap: 4,
            padding: 4,
            borderRadius: 14,
            backgroundColor: c.soft,
          }}
        >
          {(["system", "light", "dark"] as const).map((value, i) => (
            <Pressable
              key={value}
              onPress={() => setTheme(value)}
              accessibilityRole="radio"
              accessibilityLabel={["시스템", "라이트", "다크"][i]}
              accessibilityState={{ checked: theme === value }}
              style={{
                flex: 1,
                flexDirection: "row",
                gap: 6,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                borderRadius: 11,
                backgroundColor: theme === value ? c.surface : "transparent",
              }}
            >
              <Icon
                name={
                  (
                    [
                      "phone-portrait-outline",
                      "sunny-outline",
                      "moon-outline",
                    ] as const
                  )[i]
                }
                size={16}
                color={theme === value ? c.ink : c.muted}
              />
              <Label
                size={13}
                weight={theme === value ? "700" : "500"}
                muted={theme !== value}
              >
                {["시스템", "라이트", "다크"][i]}
              </Label>
            </Pressable>
          ))}
        </View>
      </Card>
      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <Icon name="lock-closed-outline" size={17} />
        <View style={{ flex: 1 }}>
          <Label muted size={12}>
            프로필·사이즈·기록은 이 기기에만 저장돼요. 계정 가입이나 서버 전송
            없이 시작할 수 있어요.
          </Label>
        </View>
      </View>
      {!!error && <Label>{error}</Label>}
      <Button
        label={state.onboarded ? "변경사항 저장" : "내 여행 시작하기"}
        primary
        onPress={() => void save()}
        busy={saving}
      />
      {!state.onboarded && (
        <Button
          label="나중에 입력하기"
          variant="ghost"
          disabled={saving}
          onPress={async () => {
            setSaving(true);
            try {
              await onSave(initialState().profile, theme);
            } catch {
              setError("저장하지 못했어요. 다시 시도해 주세요.");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
      {state.onboarded && (
        <View style={{ gap: 12 }}>
          <Button
            label="기기에 저장한 모든 정보 삭제"
            variant="danger"
            icon="trash-outline"
            disabled={saving}
            onPress={() => setConfirmReset(true)}
          />
          {confirmReset && (
            <Card tone="accent">
              <Label>
                프로필, 사이즈, 번역 기록, 즐겨찾기, 교통카드, 환율, 일정, 혜택,
                막차 타이머와 준비 체크리스트를 모두 삭제할까요? 이 작업은
                되돌릴 수 없어요.
              </Label>
              <Button
                label="모두 삭제"
                variant="danger"
                busy={saving}
                onPress={async () => {
                  setSaving(true);
                  try {
                    await onReset(initialState());
                  } catch {
                    setError("삭제하지 못했어요. 다시 시도해 주세요.");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
              <Button label="취소" onPress={() => setConfirmReset(false)} />
            </Card>
          )}
        </View>
      )}
    </View>
  );
}
