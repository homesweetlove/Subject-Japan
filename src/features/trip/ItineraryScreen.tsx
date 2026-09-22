import { useState } from "react";
import { Linking, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button, Card, Label } from "../../ui/components";
import { Field } from "../../ui/Field";
import { Choice } from "../../ui/Choice";
import { validTripItem, type TripItem } from "./itinerary";
const empty = (): TripItem => ({
  id: "",
  title: "",
  when: "",
  place: "",
  reservation: "",
  note: "",
  done: false,
});
export function ItineraryScreen({
  items,
  onSave,
  onDelete,
}: {
  items: TripItem[];
  onSave: (t: TripItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(empty),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState("");
  const field = (
    key: "title" | "when" | "place" | "reservation" | "note",
    label: string,
    maxLength: number,
  ) => (
    <Field
      label={label}
      value={draft[key]}
      onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
      maxLength={maxLength}
      multiline={key === "note"}
    />
  );
  const run = async (f: () => Promise<unknown>) => {
    try {
      await f();
      setNotice("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "요청을 완료하지 못했어요.");
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <Label size={28} weight="700">
        나만의 여행 노트
      </Label>
      <Label muted>
        일정·예약번호·메모를 기기에만 저장해요. 모든 일정은 일본 시각(JST)
        기준이에요.
      </Label>
      <Card>
        {field("title", "일정 이름", 80)}
        {field("when", "일본 날짜·시각 (YYYY-MM-DD HH:mm)", 16)}
        {field("place", "장소·주소", 100)}
        {field("reservation", "예약번호", 100)}
        {field("note", "여행 메모", 2000)}
        <Button
          label={draft.id ? "일정 수정 저장" : "일정 추가"}
          primary
          onPress={() =>
            void run(async () => {
              const item = {
                ...draft,
                title: draft.title.trim(),
                id:
                  draft.id ||
                  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              };
              if (!validTripItem(item))
                throw new Error(
                  "일정 이름과 올바른 일본 날짜·시각을 입력해 주세요.",
                );
              await onSave(item);
              setDraft(empty());
            })
          }
        />
        {!!draft.id && (
          <Button label="일정 편집 취소" onPress={() => setDraft(empty())} />
        )}
      </Card>
      {!!notice && <Label>{notice}</Label>}
      {[...items]
        .sort((a, b) => a.when.localeCompare(b.when))
        .map((t) => (
          <Card key={t.id}>
            <Label muted size={12}>
              {t.when} JST
            </Label>
            <Label size={20} weight="700">
              {t.title}
            </Label>
            {!!t.place && <Label>{t.place}</Label>}
            {!!t.reservation && (
              <>
                <Label>예약번호 {t.reservation}</Label>
                <Button
                  label={`${t.title} 예약번호 복사`}
                  onPress={() =>
                    void run(() => Clipboard.setStringAsync(t.reservation))
                  }
                />
              </>
            )}
            {!!t.note && <Label muted>{t.note}</Label>}
            <Choice
              label={`${t.title} 완료`}
              checkbox
              selected={t.done}
              onPress={() => void run(() => onSave({ ...t, done: !t.done }))}
            />
            {!!t.place && (
              <Button
                label={`${t.title} 지도에서 보기`}
                onPress={() =>
                  void run(() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.place)}`,
                    ),
                  )
                }
              />
            )}
            <Button
              label={`${t.title} 수정`}
              onPress={() => setDraft({ ...t })}
            />
            <Button
              label={
                confirm === t.id ? `${t.title} 삭제 확인` : `${t.title} 삭제`
              }
              onPress={() => {
                if (confirm !== t.id) {
                  setConfirm(t.id);
                  return;
                }
                void run(async () => {
                  await onDelete(t.id);
                  if (draft.id === t.id) setDraft(empty());
                  setConfirm("");
                });
              }}
            />
          </Card>
        ))}
      {!items.length && (
        <Label muted>
          첫 일정을 추가해 보세요. 최대 200개를 저장할 수 있어요.
        </Label>
      )}
    </View>
  );
}
