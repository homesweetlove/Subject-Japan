import { useState } from "react";
import { Modal, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { useTheme } from "../../ui/theme";
import { etiquetteGuides, type EtiquetteGuide } from "./etiquette";

export function EtiquetteScreen() {
  const c = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<
    "trash" | "onsen" | "shrine" | "hotel"
  >("trash");
  const [modalPhrase, setModalPhrase] = useState<{
    ja: string;
    reading: string;
    ko: string;
  } | null>(null);

  const guide = etiquetteGuides.find((g) => g.category === selectedCategory)!;

  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        eyebrow="CULTURE & ETIQUETTE"
        title="일본 문화 & 여행 매너"
        subtitle="쓰레기 분리배출, 온천·타투 규정, 신사 참배 순서와 료칸 유카타 착용법 안내예요."
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="쓰레기 분리배출"
          selected={selectedCategory === "trash"}
          onPress={() => setSelectedCategory("trash")}
        />
        <Choice
          label="온천 & 목욕탕"
          selected={selectedCategory === "onsen"}
          onPress={() => setSelectedCategory("onsen")}
        />
        <Choice
          label="신사 & 사찰 참배"
          selected={selectedCategory === "shrine"}
          onPress={() => setSelectedCategory("shrine")}
        />
        <Choice
          label="호텔 & 료칸 매너"
          selected={selectedCategory === "hotel"}
          onPress={() => setSelectedCategory("hotel")}
        />
      </View>

      <Card>
        <Label weight="700" size={19}>
          {guide.title}
        </Label>
        <Label muted size={14}>
          {guide.summary}
        </Label>

        {guide.keyPhrase ? (
          <View
            style={{
              backgroundColor: c.soft,
              padding: 14,
              borderRadius: 14,
              gap: 6,
            }}
          >
            <View style={styles.between}>
              <Label weight="700" size={13}>
                현지 유용한 일본어 문장
              </Label>
              <Button
                label="크게 보기"
                icon="expand-outline"
                onPress={() => setModalPhrase(guide.keyPhrase!)}
              />
            </View>
            <Text
              style={{
                color: c.ink,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {guide.keyPhrase.ja}
            </Text>
            <Text style={{ color: c.muted, fontSize: 13 }}>
              {guide.keyPhrase.reading}
            </Text>
            <Label muted size={12}>
              {guide.keyPhrase.ko}
            </Label>
          </View>
        ) : null}

        <View style={{ gap: 10, marginTop: 4 }}>
          <Label weight="700" size={15} style={{ color: c.accent }}>
            ✅ 이것은 꼭 지켜주세요 (DO)
          </Label>
          {guide.dos.map((item, idx) => (
            <View
              key={idx}
              style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
            >
              <Label weight="700" size={13} style={{ color: c.accent }}>
                •
              </Label>
              <Label size={13} style={{ flex: 1 }}>
                {item}
              </Label>
            </View>
          ))}
        </View>

        <View style={{ gap: 10, marginTop: 8 }}>
          <Label weight="700" size={15} style={{ color: c.error }}>
            ❌ 이것은 삼가해 주세요 (DON'T)
          </Label>
          {guide.donts.map((item, idx) => (
            <View
              key={idx}
              style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
            >
              <Label weight="700" size={13} style={{ color: c.error }}>
                •
              </Label>
              <Label size={13} style={{ flex: 1 }}>
                {item}
              </Label>
            </View>
          ))}
        </View>
      </Card>

      {/* Phrase presentation modal */}
      <Modal
        visible={!!modalPhrase}
        animationType="slide"
        onRequestClose={() => setModalPhrase(null)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: c.surface,
            padding: 24,
            justifyContent: "space-between",
          }}
        >
          <View style={styles.between}>
            <Label weight="700" size={15}>
              현지 직원에게 보여주세요
            </Label>
            <Button label="닫기" onPress={() => setModalPhrase(null)} />
          </View>

          <View
            style={{
              backgroundColor: c.soft,
              padding: 28,
              borderRadius: 24,
              gap: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: c.ink,
                fontSize: 24,
                fontWeight: "800",
                lineHeight: 38,
                textAlign: "center",
              }}
            >
              {modalPhrase?.ja}
            </Text>
            <Text
              style={{
                color: c.muted,
                fontSize: 15,
                textAlign: "center",
              }}
            >
              {modalPhrase?.reading}
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted size={13} style={{ textAlign: "center" }}>
              {modalPhrase?.ko}
            </Label>
            <Button
              label="확인 완료"
              primary
              onPress={() => setModalPhrase(null)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
