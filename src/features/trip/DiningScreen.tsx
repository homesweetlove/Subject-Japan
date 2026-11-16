import { useState } from "react";
import { Text, View } from "react-native";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { ShowCard } from "../../ui/ShowCard";
import { useTheme } from "../../ui/theme";
import {
  allergenItems,
  buildAllergenSentence,
  buildRamenRequest,
  calculateOtoshi,
  diningPhrases,
  type AllergenItem,
  type DiningPhrase,
  type RamenCustomization,
} from "./dining";

/** Without a saved rate the screen shows yen only (no guessed 900 KRW). */
export function DiningScreen({ krwPer100Jpy }: { krwPer100Jpy?: number }) {
  const c = useTheme();
  const [subTab, setSubTab] = useState<
    "phrases" | "allergen" | "otoshi" | "ramen"
  >("phrases");

  // Allergen states
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [showAllergenModal, setShowAllergenModal] = useState(false);

  // Otoshi states
  const [otoshiCount, setOtoshiCount] = useState("2");
  const [otoshiYen, setOtoshiYen] = useState("450");

  // Ramen states
  const [ramen, setRamen] = useState<RamenCustomization>({
    noodle: "katame",
    broth: "futsu",
    garlic: "standard",
  });
  const [showRamenModal, setShowRamenModal] = useState(false);

  // Phrase fullscreen modal
  const [fullscreenPhrase, setFullscreenPhrase] = useState<DiningPhrase | null>(
    null,
  );

  const allergenSentence = buildAllergenSentence(
    allergenItems.filter((i) => selectedAllergens.includes(i.id)),
  );
  // An empty field means "use the usual 450 yen"; a typed 0 stays 0 (refused).
  const otoshiPerPerson = otoshiYen.trim() === "" ? 450 : Number(otoshiYen);
  const otoshi = calculateOtoshi(
    Number(otoshiCount) || 1,
    Number.isFinite(otoshiPerPerson) ? otoshiPerPerson : 450,
    krwPer100Jpy ?? 0,
  );
  const ramenReq = buildRamenRequest(ramen);

  const toggleAllergen = (id: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        title="식당 주문 & 미식 도우미"
        subtitle="와사비 빼기, 오토오시(자릿세) 계산, 알레르기 카드와 라멘 주문 맞춤 설정이에요."
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="식당 필수 표현"
          selected={subTab === "phrases"}
          onPress={() => setSubTab("phrases")}
        />
        <Choice
          label="음식 알레르기 카드"
          selected={subTab === "allergen"}
          onPress={() => setSubTab("allergen")}
        />
        <Choice
          label="오토오시(자릿세)"
          selected={subTab === "otoshi"}
          onPress={() => setSubTab("otoshi")}
        />
        <Choice
          label="라멘 취향 빌더"
          selected={subTab === "ramen"}
          onPress={() => setSubTab("ramen")}
        />
      </View>

      {subTab === "phrases" ? (
        <View style={{ gap: 12 }}>
          <Card>
            <Label weight="700">
              식당 팁: 일본에서는 손을 들며 "스미마셍!"
            </Label>
            <Label muted size={13}>
              직원을 부를 때는 가볍게 손을 들며 "すみません(스미마셍)"이라고
              말씀하시면 바로 다가옵니다.
            </Label>
          </Card>

          {diningPhrases.map((phrase) => (
            <Card key={phrase.id}>
              <View style={styles.between}>
                <Label weight="700" size={17}>
                  {phrase.titleKo}
                </Label>
                <Button
                  label="크게 보기"
                  icon="expand-outline"
                  onPress={() => setFullscreenPhrase(phrase)}
                />
              </View>
              <View
                style={{
                  backgroundColor: c.soft,
                  padding: 12,
                  borderRadius: 12,
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    color: c.ink,
                    fontSize: 16,
                    fontWeight: "700",
                    lineHeight: 22,
                  }}
                >
                  {phrase.japanese}
                </Text>
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  {phrase.reading}
                </Text>
              </View>
              {phrase.detail ? (
                <Label muted size={12}>
                  {phrase.detail}
                </Label>
              ) : null}
            </Card>
          ))}
        </View>
      ) : subTab === "allergen" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700">기피 식재료 / 알레르기 선택</Label>
            <Label muted size={13}>
              원치 않거나 알레르기가 있는 항목을 선택하면 점원에게 보여줄 일본어
              문장을 자동 완성해 드려요.
            </Label>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {allergenItems.map((item) => {
                const isSelected = selectedAllergens.includes(item.id);
                return (
                  <Choice
                    key={item.id}
                    label={`${item.nameKo}`}
                    checkbox
                    selected={isSelected}
                    onPress={() => toggleAllergen(item.id)}
                  />
                );
              })}
            </View>
          </Card>

          <Card>
            <Label weight="700">점원에게 보여줄 문장 미리보기</Label>
            <View
              style={{
                backgroundColor: c.soft,
                padding: 16,
                borderRadius: 14,
                gap: 6,
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
                {allergenSentence.japanese}
              </Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>
                {allergenSentence.reading}
              </Text>
              <Label muted size={12}>
                {allergenSentence.korean}
              </Label>
            </View>

            <Button
              label="점원에게 전체화면으로 크게 보여주기"
              primary
              icon="expand-outline"
              disabled={selectedAllergens.length === 0}
              onPress={() => setShowAllergenModal(true)}
            />
          </Card>
        </View>
      ) : subTab === "otoshi" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              오토오시 (お通し)란?
            </Label>
            <Label muted size={13}>
              일본 이자카야나 주점 등에서 첫 잔과 함께 나오는 기본
              안주(자릿세)로, 1인당 통상 300엔~600엔 정도가 영수증에 자동
              추가됩니다.
            </Label>
            <Label muted size={12}>
              ※ 체인점의 경우 주문 전 "お通しは断れますか？(오토오시와
              코토와레마스카? - 자릿세 거절 가능한가요?)"라고 정중히 물어볼 수
              있으나, 개인 가게에서는 거절이 불가능한 경우가 많습니다.
            </Label>
          </Card>

          <Card>
            <Label weight="700">오토오시 예상 금액 계산</Label>
            <Field
              label="인원수 (명)"
              value={otoshiCount}
              onChange={setOtoshiCount}
              numeric
            />
            <Field
              label="1인당 예상 자릿세 (엔, 기본 450엔)"
              value={otoshiYen}
              onChange={setOtoshiYen}
              numeric
            />

            <View
              style={{
                backgroundColor: c.soft,
                padding: 14,
                borderRadius: 12,
                gap: 4,
              }}
            >
              <Label weight="700" size={15}>
                총 예상 자릿세 ({otoshi.personCount}명)
              </Label>
              <Text
                style={{
                  color: c.ink,
                  fontSize: 22,
                  fontWeight: "700",
                  fontVariant: ["tabular-nums"],
                }}
              >
                ¥{otoshi.totalYen.toLocaleString()}
              </Text>
              <Label size={13} muted={!krwPer100Jpy}>
                {krwPer100Jpy
                  ? `약 ₩${otoshi.totalKrw.toLocaleString()}`
                  : "원화 환산을 보려면 결제·할인에서 환율을 입력해 주세요."}
              </Label>
              <Label muted size={12}>
                소비세 10%가 포함되거나 별도로 붙을 수 있습니다.
              </Label>
            </View>
          </Card>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              라멘 주문 취향 선택
            </Label>
            <Label muted size={13}>
              이치란, 이에케이, 하카타 라멘 등에서 면 익힘과 국물 진하기를 내
              입맛에 맞게 커스텀해 보세요.
            </Label>

            <Label size={13} weight="700">
              면 익힘 정도 (麺のかたさ)
            </Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { key: "katame", label: "꼬들면 (硬め)" },
                { key: "futsu", label: "보통 (普通)" },
                { key: "yawarakame", label: "부드럽게 (柔らかめ)" },
              ].map((opt) => (
                <Choice
                  key={opt.key}
                  label={opt.label}
                  selected={ramen.noodle === opt.key}
                  onPress={() =>
                    setRamen((prev) => ({
                      ...prev,
                      noodle: opt.key as RamenCustomization["noodle"],
                    }))
                  }
                />
              ))}
            </View>

            <Label size={13} weight="700">
              국물 진하기 & 기름기 (味の濃さ)
            </Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { key: "assari", label: "담백하게 (薄め)" },
                { key: "futsu", label: "보통 (普通)" },
                { key: "kotteri", label: "진하고 기름지게 (濃いめ)" },
              ].map((opt) => (
                <Choice
                  key={opt.key}
                  label={opt.label}
                  selected={ramen.broth === opt.key}
                  onPress={() =>
                    setRamen((prev) => ({
                      ...prev,
                      broth: opt.key as RamenCustomization["broth"],
                    }))
                  }
                />
              ))}
            </View>

            <Label size={13} weight="700">
              마늘 양 (ニンニク)
            </Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { key: "none", label: "마늘 없음" },
                { key: "little", label: "조금" },
                { key: "standard", label: "보통" },
                { key: "extra", label: "많이 (마시마시)" },
              ].map((opt) => (
                <Choice
                  key={opt.key}
                  label={opt.label}
                  selected={ramen.garlic === opt.key}
                  onPress={() =>
                    setRamen((prev) => ({
                      ...prev,
                      garlic: opt.key as RamenCustomization["garlic"],
                    }))
                  }
                />
              ))}
            </View>

            <View
              style={{
                backgroundColor: c.soft,
                padding: 14,
                borderRadius: 12,
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: c.ink,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {ramenReq.japanese}
              </Text>
            </View>

            <Button
              label="주문서 점원에게 보여주기"
              primary
              icon="expand-outline"
              onPress={() => setShowRamenModal(true)}
            />
          </Card>
        </View>
      )}

      <ShowCard
        heading="식당 직원에게 보여주세요"
        content={
          fullscreenPhrase
            ? {
                japanese: fullscreenPhrase.japanese,
                reading: fullscreenPhrase.reading,
                korean: fullscreenPhrase.titleKo,
              }
            : showAllergenModal
              ? allergenSentence
              : showRamenModal
                ? // The ramen builder's second line is a Korean gloss.
                  { japanese: ramenReq.japanese, korean: ramenReq.reading }
                : null
        }
        onClose={() => {
          setFullscreenPhrase(null);
          setShowAllergenModal(false);
          setShowRamenModal(false);
        }}
      />
    </View>
  );
}
