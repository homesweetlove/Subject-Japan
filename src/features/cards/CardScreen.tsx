import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ScreenHeader, Button, Card, Label } from "../../ui/components";
import { Field } from "../../ui/Field";
import { travelTools } from "../tools/native";
import { decodeCard, type TransitCard } from "./model";
import type { ExchangeRate } from "../pay/calculator";
export function CardScreen({
  cards,
  rate,
  onSave,
  onDelete,
}: {
  cards: TransitCard[];
  rate: ExchangeRate | null;
  onSave: (v: TransitCard) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(""),
    [name, setName] = useState(""),
    [confirm, setConfirm] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void travelTools.cancel();
    };
  }, []);
  const scan = async () => {
    setBusy(true);
    setNotice("카드 한 장을 휴대폰 NFC 위치에 대고 움직이지 마세요.");
    try {
      const value = decodeCard(await travelTools.scanCard());
      if (!alive.current) return;
      const existing = cards.find((c) => c.id === value.id);
      value.name = existing?.name ?? `교통카드 ${cards.length + 1}`;
      await onSave(value);
      setSelected(value.id);
      setName(value.name);
      setNotice("기록을 읽어 기기에 저장했어요.");
    } catch (e) {
      if (alive.current) setNotice((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const card = cards.find((c) => c.id === selected);
  const action = async (f: () => Promise<void>) => {
    try {
      await f();
      setNotice("저장했어요.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <ScreenHeader
        title="이동을 더 가볍게"
        subtitle="Suica · PASMO · ICOCA 실물 카드의 마지막 기록을 확인해요."
      />
      <Card>
        <Button
          label="교통카드 NFC 읽기"
          primary
          busy={busy}
          onPress={() => void scan()}
        />
        {busy && (
          <Button
            label="카드 읽기 취소"
            onPress={() => void travelTools.cancel()}
          />
        )}
        <Label size={12} muted>
          {travelTools.available
            ? "NFC 지원 기기와 실물 카드가 필요해요."
            : "NFC 읽기는 전용 Android·iPhone 앱에서 지원해요."}{" "}
          같은 휴대폰의 Apple Wallet·모바일 교통카드는 읽을 수 없어요.
          충전·결제·카드 복제 기능은 제공하지 않아요.
        </Label>
      </Card>
      {!!notice && <Label>{notice}</Label>}
      {cards.map((c) => (
        <Card key={c.id}>
          <Label weight="700">{c.name}</Label>
          <Label size={30} weight="700">
            ¥{c.entries[0].balance.toLocaleString()}
          </Label>
          {rate && (
            <Label muted>
              약 ₩
              {Math.round(
                (c.entries[0].balance * rate.krwPer100Jpy) / 100,
              ).toLocaleString()}{" "}
              · {rate.date} 환율
            </Label>
          )}
          <Label size={12} muted>
            마지막 읽기 {new Date(c.readAt).toLocaleString()} · 실시간 잔액이
            아니에요.
          </Label>
          <Button
            label={`${c.name} 이용내역·이름 관리`}
            onPress={() => {
              setSelected(c.id);
              setName(c.name);
              setConfirm("");
            }}
          />
        </Card>
      ))}
      {!cards.length && (
        <Label muted>
          저장된 카드가 없어요. 최대 20장을 관리할 수 있어요. 원화 환산 환율은
          PAY에서 설정해 주세요.
        </Label>
      )}
      {card && (
        <Card>
          <Field
            label="카드 이름"
            value={name}
            onChange={setName}
            maxLength={40}
          />
          <Button
            label="카드 이름 저장"
            onPress={() =>
              void action(async () => {
                if (!name.trim()) throw new Error("카드 이름을 입력해 주세요.");
                await onSave({ ...card, name: name.trim() });
              })
            }
          />
          <Label weight="700">최근 카드 기록 · 최대 20건</Label>
          <Label size={12} muted>
            기록 당시의 잔액이에요. 카드 유형은 자동 판별하지 않으며, 역명·결제
            금액을 추측해 표시하지 않아요.
          </Label>
          {card.entries.map((e, i) => (
            <View key={i} style={{ gap: 4 }}>
              <Label>
                {e.date ?? "날짜 정보 없음"} · {e.kind}
              </Label>
              <Label muted size={13}>
                처리 후 잔액 ¥{e.balance.toLocaleString()} · 코드{" "}
                {e.processCode.toString(16).padStart(2, "0")}
              </Label>
            </View>
          ))}
          <Button
            label={confirm === card.id ? "이 카드 삭제 확인" : "카드 삭제"}
            onPress={() => {
              if (confirm !== card.id) {
                setConfirm(card.id);
                return;
              }
              void action(async () => {
                await onDelete(card.id);
                setSelected("");
                setConfirm("");
              });
            }}
          />
        </Card>
      )}
    </View>
  );
}
