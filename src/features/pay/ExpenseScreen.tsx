import { memo, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  IconButton,
  Label,
  styles,
} from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { radius, useTheme } from "../../ui/theme";
import { useStableCallback } from "../../ui/useStableCallback";
import {
  expenseCategories,
  EXPENSE_MAX_JPY,
  summarizeExpenses,
  toKrw,
  type Expense,
  type ExpenseCategory,
  type PayMethod,
} from "./expenses";

const yen = (n: number) => `¥${n.toLocaleString()}`;
const won = (n: number | null) => (n === null ? "" : ` (약 ₩${n.toLocaleString()})`);

/**
 * Travel spending log: quick entry at the till, then totals by day,
 * category and cash vs card. Kept on this device only.
 */
export function ExpenseScreen({
  expenses,
  krwPer100Jpy,
  onSave,
  onDelete,
}: {
  expenses: Expense[];
  krwPer100Jpy?: number;
  onSave: (e: Expense) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const c = useTheme();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [method, setMethod] = useState<PayMethod>("cash");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const summary = useMemo(() => summarizeExpenses(expenses), [expenses]);
  const add = async () => {
    setError("");
    const jpy = Math.round(Number(amount));
    if (!Number.isFinite(jpy) || jpy <= 0 || jpy > EXPENSE_MAX_JPY) {
      setError("쓴 금액을 엔화로 적어 주세요.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        jpy,
        category,
        method,
        memo: memo.trim().slice(0, 60),
        createdAt: Date.now(),
      });
      setAmount("");
      setMemo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const remove = useStableCallback((id: string) => {
    void onDelete(id).catch(() => setError("삭제하지 못했어요."));
  });
  const biggest = summary.byCategory[0]?.jpy ?? 0;
  return (
    <View style={{ gap: 18 }}>
      <Card>
        <Label weight="700" size={17}>
          방금 쓴 돈 적기
        </Label>
        <Field
          label="금액 (엔)"
          value={amount}
          onChange={setAmount}
          numeric
          maxLength={9}
          placeholder="예: 1280"
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {expenseCategories.map((cat) => (
            <Choice
              key={cat.key}
              label={cat.label}
              selected={category === cat.key}
              onPress={() => setCategory(cat.key)}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Choice
            label="현금"
            selected={method === "cash"}
            onPress={() => setMethod("cash")}
          />
          <Choice
            label="카드·IC카드"
            selected={method === "card"}
            onPress={() => setMethod("card")}
          />
        </View>
        <Field
          label="메모 (선택, 예: 이치란 라멘)"
          value={memo}
          onChange={setMemo}
          maxLength={60}
        />
        {error ? (
          <Text accessibilityRole="alert" style={{ color: c.error }}>
            {error}
          </Text>
        ) : null}
        <Button
          label="이 지출 기록하기"
          icon="add-circle-outline"
          primary
          busy={busy}
          onPress={() => void add()}
        />
      </Card>

      <Card>
        <View style={styles.between}>
          <Label weight="700" size={17}>
            지금까지 쓴 돈
          </Label>
          <Label muted size={13}>
            {expenses.length}건
          </Label>
        </View>
        <Text
          style={{
            color: c.ink,
            fontSize: 30,
            fontWeight: "800",
            fontVariant: ["tabular-nums"],
          }}
        >
          {yen(summary.totalJpy)}
        </Text>
        <Label muted size={13}>
          {toKrw(summary.totalJpy, krwPer100Jpy) !== null
            ? `약 ₩${toKrw(summary.totalJpy, krwPer100Jpy)!.toLocaleString()}`
            : "원화 환산을 보려면 결제·할인에서 환율을 입력해 주세요."}
        </Label>
        <Label size={14}>
          오늘 {yen(summary.todayJpy)} · 현금 {yen(summary.cashJpy)} · 카드{" "}
          {yen(summary.cardJpy)}
        </Label>
        {summary.byCategory.length ? (
          <View style={{ gap: 8 }}>
            {summary.byCategory.map((cat) => (
              <View key={cat.key} style={{ gap: 4 }}>
                <View style={styles.between}>
                  <Label size={13}>{cat.label}</Label>
                  <Label size={13} weight="700">
                    {yen(cat.jpy)}
                  </Label>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: radius.pill,
                    backgroundColor: c.soft,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.max(4, Math.round((cat.jpy / biggest) * 100))}%`,
                      borderRadius: radius.pill,
                      backgroundColor: c.accent,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Label muted size={13}>
            아직 기록이 없어요. 계산할 때마다 금액만 적어 두면 여행 경비가 자동으로
            정리돼요.
          </Label>
        )}
      </Card>

      {summary.days.map((day) => (
        <DayGroup
          key={day.day}
          day={day.day}
          jpy={day.jpy}
          items={day.items}
          krwPer100Jpy={krwPer100Jpy}
          onDelete={remove}
        />
      ))}
    </View>
  );
}

const DayGroup = memo(function DayGroup({
  day,
  jpy,
  items,
  krwPer100Jpy,
  onDelete,
}: {
  day: string;
  jpy: number;
  items: Expense[];
  krwPer100Jpy?: number;
  onDelete: (id: string) => void;
}) {
  const label = (key: ExpenseCategory) =>
    expenseCategories.find((cat) => cat.key === key)?.label ?? "";
  return (
    <Card>
      <View style={styles.between}>
        <Label weight="700">{day}</Label>
        <Label weight="700">
          {yen(jpy)}
          {won(toKrw(jpy, krwPer100Jpy))}
        </Label>
      </View>
      {items.map((e) => (
        <View key={e.id} style={[styles.row, { gap: 8 }]}>
          <View style={{ flex: 1 }}>
            <Label size={14}>
              {label(e.category)}
              {e.memo ? ` · ${e.memo}` : ""}
            </Label>
            <Label muted size={12}>
              {new Date(e.createdAt + 9 * 3600000)
                .toISOString()
                .slice(11, 16)}{" "}
              · {e.method === "cash" ? "현금" : "카드"}
            </Label>
          </View>
          <Label weight="700" size={15}>
            {yen(e.jpy)}
          </Label>
          <IconButton
            name="trash-outline"
            label={`${yen(e.jpy)} ${label(e.category)} 지출 삭제`}
            onPress={() => onDelete(e.id)}
          />
        </View>
      ))}
    </Card>
  );
});
