import { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { ShowCard } from "../../ui/ShowCard";
import { useTheme } from "../../ui/theme";
import {
  disasterGuidelines,
  emergencyContacts,
  emergencyPhrases,
  type EmergencyContact,
  type EmergencyPhraseCard,
} from "./emergency";

export function EmergencyScreen() {
  const c = useTheme();
  const [subTab, setSubTab] = useState<"contacts" | "phrases" | "disaster">(
    "contacts",
  );
  const [selectedPhrase, setSelectedPhrase] =
    useState<EmergencyPhraseCard | null>(null);
  const [callTarget, setCallTarget] = useState<EmergencyContact | null>(null);
  const [callError, setCallError] = useState("");

  const triggerCall = async (phone: string) => {
    setCallError("");
    const cleaned = phone.replace(/[^0-9+#]/g, "");
    const url = `tel:${cleaned}`;
    // canOpenURL("tel:") needs an iOS query-scheme declaration and returns
    // false without it, which would block real calls. Open directly instead.
    try {
      await Linking.openURL(url);
    } catch {
      setCallError(
        `이 기기에서 전화를 걸 수 없어요. ${phone} 번호로 직접 걸어 주세요.`,
      );
    } finally {
      setCallTarget(null);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        seal="急"
        title="긴급 상황 & 재난 대응"
        subtitle="일본 현지 긴급 전화, 대사관 연락망, 응급 일본어 카드와 지진 대피 가이드예요."
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="긴급 연락처"
          selected={subTab === "contacts"}
          onPress={() => setSubTab("contacts")}
        />
        <Choice
          label="응급 일본어 카드"
          selected={subTab === "phrases"}
          onPress={() => setSubTab("phrases")}
        />
        <Choice
          label="재난·지진 대피 요령"
          selected={subTab === "disaster"}
          onPress={() => setSubTab("disaster")}
        />
      </View>

      {callError ? (
        <Text accessibilityRole="alert" style={{ color: c.error }}>
          {callError}
        </Text>
      ) : null}

      {subTab === "contacts" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700">🚨 현지 긴급 전화 안내</Label>
            <Label muted size={13}>
              일본 내에서는 일반 유심/eSIM으로 바로 걸 수 있으며, 호텔 프런트나
              공중전화 긴급버튼(빨간색 버튼)을 누르면 동전 없이 무료 통화가
              가능해요.
            </Label>
          </Card>

          {emergencyContacts.map((contact) => (
            <Card key={contact.id}>
              <View style={styles.between}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Label weight="700" size={17}>
                    {contact.name}
                  </Label>
                  <Label muted size={12}>
                    {contact.jpName}
                  </Label>
                </View>
                <View
                  style={{
                    backgroundColor:
                      contact.category === "police" ||
                      contact.category === "medical"
                        ? c.accent
                        : c.soft,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color:
                        contact.category === "police" ||
                        contact.category === "medical"
                          ? c.inverse
                          : c.ink,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {contact.phone}
                  </Text>
                </View>
              </View>

              <Label muted size={13}>
                {contact.description}
              </Label>
              <Label muted size={12}>
                운영 시간: {contact.availableHours}
              </Label>

              <Button
                label={`전화 걸기 (${contact.phone})`}
                icon="call-outline"
                onPress={() => setCallTarget(contact)}
              />
            </Card>
          ))}
        </View>
      ) : subTab === "phrases" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700">카드를 누르면 전체화면으로 크게 보여줘요</Label>
            <Label muted size={13}>
              말하기 어려운 응급 상황에서 현지인, 역무원, 의료진에게 바로 화면을
              보여주세요.
            </Label>
          </Card>

          {emergencyPhrases.map((phrase) => (
            <Card key={phrase.id}>
              <Label weight="700" size={16}>
                {phrase.titleKo}
              </Label>
              <View
                style={{
                  padding: 12,
                  backgroundColor: c.soft,
                  borderRadius: 12,
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    color: c.ink,
                    fontSize: 17,
                    fontWeight: "700",
                    lineHeight: 24,
                  }}
                >
                  {phrase.japanese}
                </Text>
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  {phrase.reading}
                </Text>
              </View>
              <Label muted size={12}>
                {phrase.detail}
              </Label>
              <Button
                label="상대방에게 크게 보여주기"
                icon="expand-outline"
                primary
                onPress={() => setSelectedPhrase(phrase)}
              />
            </Card>
          ))}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700">⚠️ 지진 발생 시 3대 핵심 원칙</Label>
            <Label muted size={13}>
              1. 자세 낮추기 (Drop) · 2. 머리 보호하기 (Cover) · 3. 흔들림 멈출
              때까지 기다리기 (Hold on)
            </Label>
          </Card>

          {disasterGuidelines.map((guide, idx) => (
            <Card key={idx}>
              <Label weight="700" size={17}>
                📍 {guide.location}
              </Label>
              <Text
                style={{
                  color: c.ink,
                  fontSize: 15,
                  fontWeight: "600",
                  lineHeight: 22,
                }}
              >
                {guide.action}
              </Text>
              <View style={{ gap: 6, marginTop: 4 }}>
                {guide.checklist.map((item, itemIdx) => (
                  <View
                    key={itemIdx}
                    style={{
                      flexDirection: "row",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <Label muted size={13}>
                      •
                    </Label>
                    <Label muted size={13}>
                      {item}
                    </Label>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Confirmation modal for phone call */}
      <Modal
        visible={!!callTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setCallTarget(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: c.overlay,
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setCallTarget(null)}
        >
          <Pressable
            style={{
              backgroundColor: c.surface,
              borderRadius: 20,
              padding: 22,
              gap: 16,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Label weight="700" size={19}>
              긴급 전화 발신 확인
            </Label>
            <Label>
              {callTarget?.name} ({callTarget?.phone})로 전화를
              연결하시겠습니까?
            </Label>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="취소"
                style={{ flex: 1 }}
                onPress={() => setCallTarget(null)}
              />
              <Button
                label="통화 연결"
                primary
                icon="call"
                style={{ flex: 1 }}
                onPress={() => callTarget && void triggerCall(callTarget.phone)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ShowCard
        heading="상대방에게 보여주세요"
        doneLabel="화면 닫기"
        content={
          selectedPhrase
            ? {
                japanese: selectedPhrase.japanese,
                reading: selectedPhrase.reading,
                korean: `${selectedPhrase.titleKo}\n${selectedPhrase.detail}`,
              }
            : null
        }
        onClose={() => setSelectedPhrase(null)}
      />
    </View>
  );
}
