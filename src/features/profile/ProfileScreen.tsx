import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  initialState,
  type LocalState,
  type Profile,
  type SizeKey,
  type ThemePreference,
} from "../../domain/models";
import { Button, Card, Icon, Label, styles } from "../../ui/components";
import { useTheme } from "../../ui/theme";

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
      <View style={styles.between}>
        <Label size={12} weight="700" muted>
          {state.onboarded ? "MY PROFILE" : "WELCOME TO JAPAN"}
        </Label>
        {state.onboarded && <Button label="닫기" onPress={onClose} />}
      </View>
      <View style={{ gap: 8 }}>
        <Label size={30} weight="700">
          {state.onboarded ? "나에게 맞춘 여행" : "여행의 시작,\n나에게 맞게."}
        </Label>
        <Label muted>
          사이즈를 한 번 저장하면, 쇼핑할 때{"\n"}일본어 문장에 바로 담아
          드려요.
        </Label>
      </View>
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
            backgroundColor: c.bg,
            borderRadius: 14,
            padding: 16,
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
                backgroundColor: c.bg,
                borderRadius: 14,
                padding: 16,
                fontSize: 16,
              }}
            />
          </View>
        ))}
        <Label size={12} muted>
          브랜드·국가별 사이즈는 자동 환산하지 않아요. 입력한 값이 그대로
          전달되니 매장에서 규격을 확인해 주세요.
        </Label>
      </Card>
      <Card>
        <Label weight="600">화면 스타일</Label>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {(["system", "light", "dark"] as const).map((value, i) => (
            <Pressable
              key={value}
              onPress={() => setTheme(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: theme === value }}
              style={{
                backgroundColor: theme === value ? c.soft : c.bg,
                padding: 13,
                borderRadius: 12,
                borderColor: theme === value ? c.accent : c.line,
                borderWidth: 1,
              }}
            >
              <Label size={13}>{["시스템", "라이트", "다크"][i]}</Label>
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
            disabled={saving}
            onPress={() => setConfirmReset(true)}
          />
          {confirmReset && (
            <Card>
              <Label>
                프로필, 사이즈, 번역 기록, 즐겨찾기, 교통카드, 환율, 일정, 혜택,
                막차 타이머와 준비 체크리스트를 모두 삭제할까요? 이 작업은
                되돌릴 수 없어요.
              </Label>
              <Button
                label="모두 삭제"
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
