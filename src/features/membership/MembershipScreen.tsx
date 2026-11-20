import { useMemo, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Icon, IconButton, Label, styles } from "../../ui/components";
import { useTheme } from "../../ui/theme";
import type { ScannedCode } from "./scannedCode";
import { ScannedCodeView } from "./ScannedCodeView";
import { pickCode } from "./pickCode";
import { BarcodeView } from "./BarcodeView";
import { makeMembershipCard, type MembershipCard } from "./model";

export function MembershipScreen({
  cards,
  onSave,
  onDelete,
}: {
  cards: MembershipCard[];
  onSave: (card: MembershipCard) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const c = useTheme();
  const [editing, setEditing] = useState<MembershipCard | null>(null);
  const [presenting, setPresenting] = useState<MembershipCard | null>(null);
  const [name, setName] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [scannedCode, setScannedCode] = useState<ScannedCode>();
  const scanLock = useRef(false);
  const [scanning, setScanning] = useState(false);
  const scan = async (source: "camera" | "library") => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanning(true);
    setNotice("");
    try {
      const code = await pickCode(source);
      if (code) {
        setScannedCode(code);
        setBarcodeValue("");
        setNotice("코드를 인식했어요. 이름을 확인하고 저장해 주세요.");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "코드를 읽지 못했어요.");
    } finally {
      scanLock.current = false;
      setScanning(false);
    }
  };
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const resetForm = () => {
    setEditing(null);
    setName("");
    setBarcodeValue("");
    setScannedCode(undefined);
    setLink("");
    setNote("");
    setDeleteConfirm("");
  };

  const edit = (card: MembershipCard) => {
    setEditing(card);
    setName(card.name);
    setBarcodeValue(card.barcodeValue);
    setScannedCode(card.scannedCode);
    setLink(card.link);
    setNote(card.note);
    setDeleteConfirm("");
    setNotice("");
  };

  const save = async () => {
    setBusy(true);
    setNotice("");
    try {
      const card = makeMembershipCard({
        id: editing?.id,
        name,
        barcodeValue,
        scannedCode,
        link,
        note,
        now: Date.now(),
      });
      if (editing) card.createdAt = editing.createdAt;
      await onSave(card);
      resetForm();
      setNotice("멤버십을 기기에 저장했어요.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "멤버십을 저장하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sorted = useMemo(
    () => [...cards].sort((a, b) => b.updatedAt - a.updatedAt),
    [cards],
  );
  const previewValue = barcodeValue.trim();
  const previewReady =
    previewValue.length > 0 &&
    previewValue.length <= 24 &&
    /^[\x20-\x7E]+$/.test(previewValue);

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 3 }}>
        <Label size={18} weight="700">
          내 멤버십
        </Label>
        <Label muted size={13}>
          회원 바코드나 Visit Japan Web QR을 촬영하거나 스크린샷에서 등록하세요.
        </Label>
      </View>

      {sorted.map((card) => (
        <Pressable
          key={card.id}
          accessibilityRole="button"
          accessibilityLabel={`${card.name} 멤버십 열기`}
          onPress={() => setPresenting(card)}
          style={({ pressed }) => ({
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderColor: c.line,
            opacity: pressed ? 0.62 : 1,
          })}
        >
          <View style={styles.between}>
            <View style={{ flex: 1, gap: 4 }}>
              <Label size={17} weight="700">
                {card.name}
              </Label>
              <Label muted size={12}>
                {card.scannedCode
                  ? card.scannedCode.kind === "qr"
                    ? "QR 코드"
                    : "바코드"
                  : card.barcodeValue
                    ? `바코드 · ${card.barcodeValue.length}자리`
                    : "웹 멤버십 바로가기"}
                {card.note ? ` · ${card.note}` : ""}
              </Label>
            </View>
            <Icon name="chevron-forward" size={18} color={c.muted} />
          </View>
        </Pressable>
      ))}

      {!sorted.length ? (
        <View
          style={{
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: c.line,
            paddingVertical: 20,
            gap: 5,
          }}
        >
          <Label weight="600">등록된 멤버십이 없어요.</Label>
          <Label muted size={13}>
            Rakuten Point, Ponta 같은 바코드형 멤버십도 번호를 직접 저장할 수
            있어요.
          </Label>
        </View>
      ) : null}

      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.line,
          paddingTop: 18,
          gap: 12,
        }}
      >
        <Label size={16} weight="700">
          {editing ? "멤버십 수정" : "멤버십 추가"}
        </Label>
        <TextInput
          accessibilityLabel="멤버십 이름"
          placeholder="이름  예: Rakuten Point"
          placeholderTextColor={c.muted}
          value={name}
          onChangeText={setName}
          maxLength={40}
          style={{
            color: c.ink,
            minHeight: 46,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 7,
            backgroundColor: c.surface,
          }}
        />
        <Button
          label="QR·바코드 촬영"
          icon="camera-outline"
          disabled={scanning || busy}
          onPress={() => void scan("camera")}
        />
        <Button
          label="사진·스크린샷에서 인식"
          icon="image-outline"
          disabled={scanning || busy}
          onPress={() => void scan("library")}
        />
        {scanning && <Label muted>코드를 읽고 있어요…</Label>}
        {scannedCode ? (
          <>
            <ScannedCodeView code={scannedCode} />
            <Button
              label="인식한 코드 지우기"
              variant="ghost"
              onPress={() => setScannedCode(undefined)}
            />
          </>
        ) : (
          <TextInput
            accessibilityLabel="바코드 번호"
            placeholder="바코드 번호  선택"
            placeholderTextColor={c.muted}
            value={barcodeValue}
            onChangeText={setBarcodeValue}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            style={{
              color: c.ink,
              minHeight: 46,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 7,
              backgroundColor: c.surface,
              fontVariant: ["tabular-nums"],
            }}
          />
        )}
        {previewReady ? (
          <View style={{ gap: 6 }}>
            <BarcodeView value={previewValue} compact />
            <Label muted size={11}>
              유효한 EAN-13 번호는 EAN-13으로, 그 외 값은 CODE 128로 기기에서
              생성해요.
            </Label>
          </View>
        ) : previewValue ? (
          <Label muted size={11}>
            바코드 미리보기는 영문·숫자·기호 24자까지 지원해요.
          </Label>
        ) : null}
        <TextInput
          accessibilityLabel="멤버십 바로가기"
          placeholder="https:// 멤버십·공식 앱 안내 링크  선택"
          placeholderTextColor={c.muted}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          maxLength={300}
          style={{
            color: c.ink,
            minHeight: 46,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 7,
            backgroundColor: c.surface,
          }}
        />
        <TextInput
          accessibilityLabel="멤버십 메모"
          placeholder="메모  선택"
          placeholderTextColor={c.muted}
          value={note}
          onChangeText={setNote}
          maxLength={100}
          style={{
            color: c.ink,
            minHeight: 46,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 7,
            backgroundColor: c.surface,
          }}
        />
        <Label muted size={11}>
          코드는 이 기기에서 인식하고 저장해요. 여행 QR도 앱의 전체 데이터
          백업에 포함됩니다. Visit Japan Web 면세 QR의 유효기간이 지나면 공식
          사이트에서 새 코드를 받아 주세요.
        </Label>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={editing ? "수정 저장" : "추가"}
              primary
              busy={busy}
              disabled={scanning}
              onPress={() => void save()}
            />
          </View>
          {editing ? (
            <View style={{ flex: 1 }}>
              <Button label="취소" variant="ghost" onPress={resetForm} />
            </View>
          ) : null}
        </View>
      </View>

      {!!notice && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.muted, fontSize: 13 }}
        >
          {notice}
        </Text>
      )}

      <Modal
        visible={!!presenting}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPresenting(null)}
      >
        {presenting ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <View
              style={{
                flex: 1,
                width: "100%",
                maxWidth: 620,
                alignSelf: "center",
                paddingHorizontal: 22,
              }}
            >
              <View
                style={{
                  minHeight: 58,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottomWidth: 1,
                  borderColor: "#E5E5E5",
                }}
              >
                <Text
                  style={{ color: "#111111", fontSize: 17, fontWeight: "700" }}
                >
                  {presenting.name}
                </Text>
                <IconButton
                  name="close"
                  label="멤버십 닫기"
                  color="#111111"
                  onPress={() => setPresenting(null)}
                />
              </View>
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  paddingVertical: 30,
                  gap: 18,
                }}
              >
                {presenting.scannedCode && (
                  <ScannedCodeView code={presenting.scannedCode} />
                )}
                {presenting.barcodeValue ? (
                  <>
                    <BarcodeView value={presenting.barcodeValue} />
                    <Button
                      label="회원번호 복사"
                      icon="copy-outline"
                      onPress={() =>
                        void Clipboard.setStringAsync(presenting.barcodeValue)
                      }
                    />
                  </>
                ) : null}
                {presenting.link ? (
                  <Button
                    label="공식 멤버십 열기"
                    icon="open-outline"
                    primary
                    onPress={() =>
                      void Linking.openURL(presenting.link).catch(() =>
                        setNotice("멤버십 링크를 열지 못했어요."),
                      )
                    }
                  />
                ) : null}
                {presenting.note ? (
                  <Text
                    style={{
                      color: "#6B6B6B",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {presenting.note}
                  </Text>
                ) : null}
                <View
                  style={{
                    marginTop: 10,
                    borderTopWidth: 1,
                    borderColor: "#E5E5E5",
                    paddingTop: 16,
                    gap: 8,
                  }}
                >
                  <Button
                    label="이 멤버십 수정"
                    onPress={() => {
                      edit(presenting);
                      setPresenting(null);
                    }}
                  />
                  <Button
                    label={
                      deleteConfirm === presenting.id
                        ? "삭제 확인"
                        : "멤버십 삭제"
                    }
                    variant="danger"
                    onPress={() => {
                      if (deleteConfirm !== presenting.id) {
                        setDeleteConfirm(presenting.id);
                        return;
                      }
                      void onDelete(presenting.id)
                        .then(() => {
                          setPresenting(null);
                          setDeleteConfirm("");
                        })
                        .catch(() => setNotice("멤버십을 삭제하지 못했어요."));
                    }}
                  />
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>
    </View>
  );
}
