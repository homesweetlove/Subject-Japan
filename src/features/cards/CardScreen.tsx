import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ScreenHeader, Button, Card, Label } from "../../ui/components";
import { Field } from "../../ui/Field";
import { travelTools, type NfcState } from "../tools/native";
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
  const [nfcState, setNfcState] = useState<NfcState | "unknown">("unknown");
  const refreshNfc = async () => {
    try {
      const capabilities = await travelTools.capabilities();
      if (alive.current) setNfcState(capabilities.nfcState ?? "unknown");
    } catch {
      if (alive.current) setNfcState("unknown");
    }
  };
  useEffect(() => {
    alive.current = true;
    void refreshNfc();
    return () => {
      alive.current = false;
      void travelTools.cancel();
    };
  }, []);
  const scan = async () => {
    setBusy(true);
    setNotice("카드 한 장을 휴대폰 NFC 위치에 대고 움직이지 마세요.");
    try {
      const capabilities = await travelTools.capabilities();
      if (!alive.current) return;
      setNfcState(capabilities.nfcState ?? "unknown");
      if (capabilities.nfcState === "unsupported")
        throw new Error("이 기기는 NFC를 지원하지 않아요.");
      if (capabilities.nfcState === "disabled")
        throw new Error("설정에서 NFC를 켜고 다시 시도해 주세요.");
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
      {cards.map((c) => (
        <Card key={c.id}>
          <Label weight="700">{c.name}</Label>
          <Label size={40} weight="700">
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
        <Button
          label="NFC 상태 새로고침"
          disabled={busy}
          onPress={() => void refreshNfc()}
        />
        <Label size={12} muted>
          {nfcState === "ready"
            ? "NFC가 켜져 있어요. FeliCa 카드 인식은 실물 카드로 확인해야 해요."
            : nfcState === "disabled"
              ? "NFC가 꺼져 있어요. 기기 설정에서 켜 주세요."
              : nfcState === "unsupported"
                ? "이 기기는 NFC를 지원하지 않아요."
                : "NFC 상태를 확인하지 못했어요. 전용 앱에서 확인해 주세요."}{" "}
          같은 휴대폰의 Apple Wallet·모바일 교통카드는 읽을 수 없어요.
          충전·결제·카드 복제 기능은 제공하지 않아요. NFC 이력 읽기는 실제
          카드·기기 검증 전이며 일부 기록만 읽힌 경우 저장하지 않아요.
        </Label>
      </Card>
      {!!notice && <Label>{notice}</Label>}
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
