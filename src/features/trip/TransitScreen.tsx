import { useState } from "react";
import { Text, View } from "react-native";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { useTheme } from "../../ui/theme";
import {
  calculateTaxiFare,
  comparePassVsSuica,
  shinkansenBaggageRules,
  subwayLineCodes,
  taxiTariffs,
  TRANSIT_CHECKED_ON,
  transitPasses,
  type TransitPassOption,
} from "./transit";

/** Without a saved rate the taxi estimate shows yen only. */
export function TransitScreen({
  krwPer100Jpy,
  initialTab = "passes",
}: {
  krwPer100Jpy?: number;
  initialTab?: "passes" | "shinkansen" | "subway" | "taxi";
}) {
  const c = useTheme();
  const [subTab, setSubTab] = useState<
    "passes" | "shinkansen" | "subway" | "taxi"
  >(initialTab);

  // Pass calculator states
  const [selectedPassId, setSelectedPassId] = useState(transitPasses[0].id);
  const [ridesCount, setRidesCount] = useState("5");

  // Taxi states
  const [taxiKm, setTaxiKm] = useState("3.5");
  const [taxiCity, setTaxiCity] = useState<"tokyo" | "osaka" | "fukuoka">(
    "tokyo",
  );
  const [isNight, setIsNight] = useState(false);

  // Subway city filter
  const [subwayCity, setSubwayCity] = useState<"tokyo" | "osaka">("tokyo");

  const selectedPass = transitPasses.find((p) => p.id === selectedPassId)!;
  const passComparison = comparePassVsSuica(
    selectedPass,
    Number(ridesCount) || 1,
  );
  const taxi = calculateTaxiFare(
    Number(taxiKm) || 1,
    taxiCity,
    isNight,
    krwPer100Jpy ?? 0,
  );
  const filteredSubways = subwayLineCodes.filter((s) => s.city === subwayCity);

  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        seal="駅"
        title="교통 & 패스 유틸리티"
        subtitle="패스 vs Suica 본전 계산, 신칸센 대형 수하물 예약 규칙, 지하철 노선 색상표와 택시 요금 계산기예요."
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="교통 패스 본전 계산"
          selected={subTab === "passes"}
          onPress={() => setSubTab("passes")}
        />
        <Choice
          label="신칸센 특대 수하물"
          selected={subTab === "shinkansen"}
          onPress={() => setSubTab("shinkansen")}
        />
        <Choice
          label="지하철 노선 코드"
          selected={subTab === "subway"}
          onPress={() => setSubTab("subway")}
        />
        <Choice
          label="택시 요금 계산기"
          selected={subTab === "taxi"}
          onPress={() => setSubTab("taxi")}
        />
      </View>

      {subTab === "passes" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700">패스를 살까? Suica(IC카드)로 탈까?</Label>
            <Label muted size={13}>
              관심 있는 교통 패스와 하루 예상 승차 횟수를 입력하면 무엇이 더
              이득인지 계산해 드려요.
            </Label>
            <Label muted size={12}>
              패스 가격은 {TRANSIT_CHECKED_ON} 운영사 안내 기준입니다.
            </Label>

            <Label size={13} weight="700">
              교통 패스 선택
            </Label>
            <View style={{ gap: 8 }}>
              {transitPasses.map((pass) => (
                <Choice
                  key={pass.id}
                  label={`${pass.name} (¥${pass.priceYen.toLocaleString()})`}
                  selected={selectedPassId === pass.id}
                  onPress={() => setSelectedPassId(pass.id)}
                />
              ))}
            </View>

            <Field
              label="기간 동안 예상 총 탑승 횟수 (회)"
              value={ridesCount}
              onChange={setRidesCount}
              numeric
            />

            <View
              style={{
                backgroundColor: c.soft,
                padding: 16,
                borderRadius: 14,
                gap: 6,
              }}
            >
              <View style={styles.between}>
                <Label weight="700" size={16}>
                  비교 분석 결과
                </Label>
                <View
                  style={{
                    backgroundColor:
                      passComparison.recommendation === "pass"
                        ? c.accent
                        : c.soft,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        passComparison.recommendation === "pass"
                          ? c.inverse
                          : c.ink,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {passComparison.recommendation === "pass"
                      ? `패스 구매 추천 (¥${passComparison.savingYen.toLocaleString()} 이득)`
                      : passComparison.recommendation === "suica"
                        ? `Suica/IC카드 추천 (¥${passComparison.savingYen.toLocaleString()} 절약)`
                        : "비용 동일"}
                  </Text>
                </View>
              </View>

              <Label size={13}>
                • 패스 정가: ¥{passComparison.passPrice.toLocaleString()} |
                Suica 예상 운임: ¥{passComparison.suicaTotal.toLocaleString()}
              </Label>
              <Label muted size={12}>
                {selectedPass.description}
              </Label>
              <Label muted size={12}>
                💡 {selectedPass.notes}
              </Label>
            </View>
          </Card>
        </View>
      ) : subTab === "shinkansen" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              🚄 신칸센 특대하물(대형 캐리어) 예약 필수 규정
            </Label>
            <Label muted size={13}>
              도카이도·산요·규슈 신칸센(도쿄-나고야-교토-신오사카-하카타 구간)
              탑승 시 큰 캐리어는 반드시 사전 예약이 필요합니다.
            </Label>
            <Label muted size={12}>
              2025년 7월부터 도카이도·산요 신칸센 일부 열차는 객차 사이 공간의
              '특대 짐 코너'를 예약 없이 시험 운영 중입니다. 자리가 없을 수
              있으니 예약을 기본으로 생각하세요.
            </Label>
          </Card>

          {shinkansenBaggageRules.map((rule, idx) => (
            <Card key={idx}>
              <View style={styles.between}>
                <Label weight="700" size={15}>
                  {rule.dimensionRange}
                </Label>
                <View
                  style={{
                    backgroundColor: rule.reservationRequired
                      ? c.accent
                      : c.soft,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: rule.reservationRequired ? c.inverse : c.ink,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {rule.reservationRequired
                      ? "사전 예약 필수"
                      : "예약 불필요"}
                  </Text>
                </View>
              </View>
              <Label muted size={13}>
                {rule.guide}
              </Label>
              {rule.penaltyFeeYen > 0 ? (
                <Label size={12} style={{ color: c.error, fontWeight: "600" }}>
                  ⚠️ 미예약 탑승 시 현장 수수료 ¥
                  {rule.penaltyFeeYen.toLocaleString()} 부과
                </Label>
              ) : null}
            </Card>
          ))}
        </View>
      ) : subTab === "subway" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700">지하철 알파벳 기호와 노선 색상표</Label>
            <Label muted size={13}>
              일본 지하철은 역 번호(예: G01, M16)와 노선 색상만 알면 일본어를
              몰라도 절대 길을 잃지 않습니다.
            </Label>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Choice
                label="도쿄 (Tokyo)"
                selected={subwayCity === "tokyo"}
                onPress={() => setSubwayCity("tokyo")}
              />
              <Choice
                label="오사카 (Osaka)"
                selected={subwayCity === "osaka"}
                onPress={() => setSubwayCity("osaka")}
              />
            </View>
          </Card>

          {filteredSubways.map((line) => (
            <Card key={line.code + line.nameKo}>
              <View style={styles.between}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: line.colorHex,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "900",
                        fontSize: 16,
                      }}
                    >
                      {line.code}
                    </Text>
                  </View>
                  <View>
                    <Label weight="700" size={16}>
                      {line.nameKo}
                    </Label>
                    <Label muted size={12}>
                      {line.nameJa}
                    </Label>
                  </View>
                </View>
              </View>
              <Label muted size={13}>
                주요 정차역: {line.keyStops}
              </Label>
            </Card>
          ))}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              🚕 일본 택시 요금 계산기 & 매너
            </Label>
            <Label muted size={13}>
              ⚠️ 주의: 일본 택시 뒷좌석 문은 기사님이 레버로 열어주는
              '자동문'입니다. 직접 문을 열거나 닫지 마세요!
            </Label>
            <Label muted size={12}>
              일본은 팁 문화가 없으므로 미터기 요금만 정확히 지불하시면 됩니다.
            </Label>
          </Card>

          <Card>
            <Label weight="700">택시 예상 요금 계산</Label>
            <Field
              label="이동 거리 (km)"
              value={taxiKm}
              onChange={setTaxiKm}
              numeric
            />

            <Label size={13} weight="700">
              도시 선택
            </Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["tokyo", "osaka", "fukuoka"] as const).map((city) => (
                <Choice
                  key={city}
                  label={
                    city === "tokyo"
                      ? "도쿄"
                      : city === "osaka"
                        ? "오사카"
                        : "후쿠오카"
                  }
                  selected={taxiCity === city}
                  onPress={() => setTaxiCity(city)}
                />
              ))}
            </View>

            <Choice
              label="심야 할증 (22:00 ~ 05:00, 20% 가산)"
              checkbox
              selected={isNight}
              onPress={() => setIsNight(!isNight)}
            />

            <View
              style={{
                backgroundColor: c.soft,
                padding: 16,
                borderRadius: 14,
                gap: 4,
              }}
            >
              <Label weight="700" size={15}>
                예상 택시 요금 ({taxi.distanceKm} km 기준)
              </Label>
              <Text
                style={{
                  color: c.ink,
                  fontSize: 26,
                  fontWeight: "800",
                  fontVariant: ["tabular-nums"],
                }}
              >
                약 ¥{taxi.estimatedFareYen.toLocaleString()}
              </Text>
              <Label size={13} muted={!krwPer100Jpy}>
                {krwPer100Jpy
                  ? `원화 약 ₩${taxi.estimatedKrw.toLocaleString()}`
                  : "원화 환산을 보려면 결제·할인에서 환율을 입력해 주세요."}
              </Label>
              <Label muted size={12}>
                기본요금 ¥{taxi.baseFareYen} (첫 {taxiTariffs[taxiCity].baseKm}
                km), 이후 {taxiTariffs[taxiCity].stepM}m마다 ¥
                {taxiTariffs[taxiCity].stepYen}
                {isNight
                  ? ` · 심야할증 +¥${taxi.nightSurchargeYen.toLocaleString()} 반영`
                  : ""}
                . 막히는 길에서는 시간 요금이 더 붙고, 앱으로 부르면 호출료가 따로
                나옵니다. 요금 기준 {taxiTariffs[taxiCity].since} 개정.
              </Label>
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}
