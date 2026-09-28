import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import {
  Button,
  Icon,
  Label,
  ScreenHeader,
  SubNav,
  styles,
} from "../../ui/components";
import { Field } from "../../ui/Field";
import { useTheme } from "../../ui/theme";
import { MembershipScreen } from "../membership/MembershipScreen";
import type { MembershipCard } from "../membership/model";
import type { ExchangeRate } from "../pay/calculator";
import { travelTools } from "../tools/native";
import { decodeCard, type TransitCard } from "./model";

type CardSection = "transit" | "membership";

export function CardScreen({
  cards,
  memberships,
  rate,
  onSave,
  onDelete,
  onSaveMembership,
  onDeleteMembership,
}: {
  cards: TransitCard[];
  memberships: MembershipCard[];
  rate: ExchangeRate | null;
  onSave: (v: TransitCard) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSaveMembership: (v: MembershipCard) => Promise<void>;
  onDeleteMembership: (id: string) => Promise<void>;
}) {
  const [section, setSection] = useState<CardSection>("transit");
  return (
    <View style={{ gap: 18 }}>
      <ScreenHeader
        title="카드"
        subtitle="교통카드 잔액과 매장 멤버십을 한곳에서 관리합니다."
      />
      <SubNav
        items={[
          { key: "transit", label: "교통카드", icon: "train-outline" },
          { key: "membership", label: "멤버십", icon: "barcode-outline" },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === "transit" ? (
        <TransitSection
          cards={cards}
          rate={rate}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : (
        <MembershipScreen
          cards={memberships}
          onSave={onSaveMembership}
          onDelete={onDeleteMembership}
        />
      )}
    </View>
  );
}

function TransitSection({
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
  const c = useTheme();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
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
    setNotice("카드를 휴대폰 NFC 위치에 대고 잠시 그대로 두세요.");
    try {
      const value = decodeCard(await travelTools.scanCard());
      if (!alive.current) return;
      const existing = cards.find((card) => card.id === value.id);
      value.name = existing?.name ?? `교통카드 ${cards.length + 1}`;
      await onSave(value);
      setSelected(value.id);
      setName(value.name);
      setNotice("최근 기록을 기기에 저장했어요.");
    } catch (error) {
      if (alive.current) setNotice((error as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const selectedCard = cards.find((card) => card.id === selected);
  const action = async (run: () => Promise<void>) => {
    try {
      await run();
      setNotice("저장했어요.");
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          paddingVertical: 14,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: c.line,
          gap: 10,
        }}
      >
        <Button
          label="NFC로 교통카드 읽기"
          primary
          busy={busy}
          onPress={() => void scan()}
        />
        {busy ? (
          <Button label="읽기 취소" variant="ghost" onPress={() => void travelTools.cancel()} />
        ) : null}
        <Label size={11} muted>
          {travelTools.available
            ? "실물 Suica · PASMO · ICOCA 계열 카드의 저장 기록을 읽습니다."
            : "NFC 읽기는 전용 Android·iPhone 앱에서 지원합니다."}{" "}
          모바일 지갑 속 교통카드는 읽지 않으며 충전·복제 기능은 제공하지 않습니다.
        </Label>
      </View>

      {!!notice && <Label muted size={13}>{notice}</Label>}

      <View>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            accessibilityRole="button"
            accessibilityLabel={`${card.name} 상세 보기`}
            onPress={() => {
              setSelected(card.id);
              setName(card.name);
              setConfirm("");
            }}
            style={({ pressed }) => ({
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderColor: c.line,
              opacity: pressed ? 0.62 : 1,
            })}
          >
            <View style={styles.between}>
              <View style={{ gap: 3 }}>
                <Label weight="700">{card.name}</Label>
                <Label muted size={11}>
                  {new Date(card.readAt).toLocaleString()} 기준
                </Label>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Label size={22} weight="700">
                  ¥{card.entries[0].balance.toLocaleString()}
                </Label>
                {rate ? (
                  <Label muted size={11}>
                    약 ₩{Math.round((card.entries[0].balance * rate.krwPer100Jpy) / 100).toLocaleString()}
                  </Label>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {!cards.length ? (
        <Label muted size={13}>
          저장된 교통카드가 없습니다. 최대 20장을 관리할 수 있어요.
        </Label>
      ) : null}

      {selectedCard ? (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 18,
            gap: 14,
          }}
        >
          <View style={styles.between}>
            <Label size={17} weight="700">카드 상세</Label>
            <Icon name="card-outline" size={18} color={c.muted} />
          </View>
          <Field label="카드 이름" value={name} onChange={setName} maxLength={40} />
          <Button
            label="이름 저장"
            onPress={() =>
              void action(async () => {
                if (!name.trim()) throw new Error("카드 이름을 입력해 주세요.");
                await onSave({ ...selectedCard, name: name.trim() });
              })
            }
          />
          <Label size={13} weight="700">최근 기록</Label>
          {selectedCard.entries.map((entry, index) => (
            <View
              key={index}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: c.line,
                gap: 2,
              }}
            >
              <Label size={14}>
                {entry.date ?? "날짜 정보 없음"} · {entry.kind}
              </Label>
              <Label muted size={12}>
                처리 후 ¥{entry.balance.toLocaleString()}
              </Label>
            </View>
          ))}
          <Button
            label={confirm === selectedCard.id ? "삭제 확인" : "카드 삭제"}
            variant="danger"
            onPress={() => {
              if (confirm !== selectedCard.id) {
                setConfirm(selectedCard.id);
                return;
              }
              void action(async () => {
                await onDelete(selectedCard.id);
                setSelected("");
                setConfirm("");
              });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
