import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button, Card, Label } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { useTheme } from "../../ui/theme";
import { openTravelLink } from "./links";
import type { TravelGuide } from "./catalog";

export function GuideScreen({
  title,
  subtitle,
  guides,
  checked,
  onToggle,
}: {
  title: string;
  subtitle: string;
  guides: readonly TravelGuide[];
  checked: string[];
  onToggle: (id: string) => Promise<void>;
}) {
  const c = useTheme();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(
    guides[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const filtered = guides.filter((g) =>
    `${g.title} ${g.summary} ${g.badge} ${g.sections.map((s) => s.body).join(" ")}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 8 }}>
        <Label size={28} weight="700">
          {title}
        </Label>
        <Label muted>{subtitle}</Label>
      </View>
      <TextInput
        accessibilityLabel="가이드 검색"
        placeholder="판매처, 백화점, 준비물 검색"
        value={query}
        onChangeText={setQuery}
        maxLength={100}
        placeholderTextColor={c.muted}
        style={{
          padding: 16,
          borderRadius: 16,
          borderColor: c.line,
          borderWidth: 1,
          color: c.ink,
          backgroundColor: c.surface,
          fontSize: 15,
        }}
      />
      <Label muted size={12}>
        공식 안내 확인: 2026-09-22 · 공연·점포별 최신 조건을 다시 확인하세요.
        체크리스트는 이 기기에 저장되며 티켓·회원 자격·예약을 발급하지 않아요.
      </Label>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.error }}>
          {error}
        </Text>
      ) : null}
      {!filtered.length ? (
        <Label muted>검색 조건에 맞는 가이드가 없어요.</Label>
      ) : null}
      {filtered.map((guide) => {
        const count = guide.checklist.filter((item) =>
          checked.includes(`${guide.id}-${item.id}`),
        ).length;
        return (
          <Card key={guide.id}>
            <Label muted size={12}>
              {guide.badge} · 준비 {count}/{guide.checklist.length}
            </Label>
            <Label weight="700" size={21}>
              {guide.title}
            </Label>
            <Label muted>{guide.summary}</Label>
            <Button
              label={`${guide.title} ${expanded === guide.id ? "접기" : "펼치기"}`}
              onPress={() => {
                setExpanded(expanded === guide.id ? null : guide.id);
                setCopied(null);
              }}
            />
            {expanded === guide.id ? (
              <View style={{ gap: 20 }}>
                {guide.sections.map((section) => (
                  <View key={section.title} style={{ gap: 6 }}>
                    <Label weight="700">{section.title}</Label>
                    <Label muted size={14}>
                      {section.body}
                    </Label>
                  </View>
                ))}
                <Label weight="700">내 준비 체크리스트</Label>
                {guide.checklist.map((item) => (
                  <Choice
                    checkbox
                    key={item.id}
                    label={item.label}
                    selected={checked.includes(`${guide.id}-${item.id}`)}
                    disabled={busy}
                    onPress={() =>
                      void run(() => onToggle(`${guide.id}-${item.id}`))
                    }
                  />
                ))}
                {guide.phrase ? (
                  <View style={{ gap: 8 }}>
                    <Label muted size={13}>
                      {guide.phrase.ko}
                    </Label>
                    <Label>{guide.phrase.ja}</Label>
                    <Button
                      label={
                        copied === guide.id
                          ? "일본어 문장 복사 완료"
                          : "일본어 도움 문장 복사"
                      }
                      icon="copy-outline"
                      onPress={() =>
                        void run(async () => {
                          await Clipboard.setStringAsync(guide.phrase!.ja);
                          setCopied(guide.id);
                        })
                      }
                    />
                  </View>
                ) : null}
                {guide.links.map((link) => (
                  <Button
                    key={link.url}
                    label={link.label}
                    icon="open-outline"
                    onPress={() => void run(() => openTravelLink(link.url))}
                  />
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
