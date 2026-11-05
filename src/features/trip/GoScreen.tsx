import { useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import type { TripItem } from "./itinerary";
import type { Departure } from "./departure";
import { taxFreeAirports } from "../pay/airportTaxFree";
import { openTravelLink } from "../guides/links";
import {
  googleDirectionsUrl,
  railInfoLinks,
  taxiPhrase,
  uberUrl,
} from "./routes";
import {
  Button,
  Card,
  Icon,
  Label,
  ScreenHeader,
  styles,
} from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { ShowCard, type ShowCardContent } from "../../ui/ShowCard";
import { useTheme } from "../../ui/theme";

/**
 * Getting around: one destination, then hand it to the app that does that
 * job best (Google Maps for transit, Uber for a fare estimate), show it to
 * a taxi driver in Japanese, and check whether the trains are running.
 */
export function GoScreen({
  tripItems,
  departure,
  onOpenTaxiFare,
}: {
  tripItems: TripItem[];
  departure: Departure | null;
  onOpenTaxiFare: () => void;
}) {
  const c = useTheme();
  const [destination, setDestination] = useState("");
  const [show, setShow] = useState<ShowCardContent | null>(null);
  const [error, setError] = useState("");
  // Places the user already wrote down: itinerary places and the airport home.
  const quickPicks = useMemo(() => {
    const picks: string[] = [];
    const airport = departure
      ? taxFreeAirports.find((a) => a.id === departure.airportId)
      : null;
    if (airport) picks.push(airport.jaName);
    for (const t of tripItems)
      if (t.place.trim() && !t.done) picks.push(t.place.trim());
    return [...new Set(picks)].slice(0, 8);
  }, [tripItems, departure]);
  const target = destination.trim();
  const open = async (url: string) => {
    setError("");
    try {
      await Linking.openURL(url);
    } catch {
      setError("앱이나 브라우저를 열지 못했어요. 다시 시도해 주세요.");
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        seal="道"
        title="어디로 갈까요"
        subtitle="가고 싶은 곳을 한 번 적으면 길찾기, 우버 예상 요금, 택시 기사에게 보여줄 일본어까지 한 번에 이어져요."
      />

      <Card>
        <Field
          label="가고 싶은 곳 (일본어 주소나 장소 이름이 가장 정확해요)"
          value={destination}
          onChange={setDestination}
          maxLength={100}
          placeholder="예: 大阪城, 難波駅, 호텔 주소"
        />
        {quickPicks.length ? (
          <View style={{ gap: 8 }}>
            <Label muted size={12}>
              내 일정·출국 공항에서 고르기
            </Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {quickPicks.map((place) => (
                <Choice
                  key={place}
                  label={place}
                  selected={destination.trim() === place}
                  onPress={() => setDestination(place)}
                />
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          <Button
            label="대중교통 길찾기 (구글 지도)"
            icon="train-outline"
            primary
            disabled={!target}
            onPress={() => void open(googleDirectionsUrl(target, "transit"))}
          />
          <Button
            label="걸어서 가는 길"
            icon="walk-outline"
            disabled={!target}
            onPress={() => void open(googleDirectionsUrl(target, "walking"))}
          />
          <Button
            label="우버에서 예상 요금 보기"
            icon="car-outline"
            disabled={!target}
            onPress={() => void open(uberUrl(target))}
          />
          <Button
            label="택시 기사에게 보여주기"
            icon="expand-outline"
            disabled={!target}
            onPress={() =>
              setShow({
                japanese: taxiPhrase.japanese(target),
                reading: taxiPhrase.reading,
                korean: `${taxiPhrase.korean} (${target})`,
              })
            }
          />
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={{ color: c.error }}>
            {error}
          </Text>
        ) : null}
        <Label muted size={12}>
          적은 목적지만 지도·우버 앱으로 넘겨요. 우버는 앱이 직접 현재 위치를
          출발지로 잡고, 예약 전에 예상 요금을 보여줘요. 일본에서 우버를 부르면
          대개 일반 택시가 와요.
        </Label>
      </Card>

      <Card tone="muted">
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <Icon name="calculator-outline" size={20} color={c.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <Label weight="700">택시 요금 미리 어림하기</Label>
            <Label muted size={13}>
              거리만 알면 도쿄·오사카·후쿠오카 기본요금과 심야 할증으로
              계산해요. 우버 예상 요금과 비교해 보세요.
            </Label>
          </View>
        </View>
        <Button
          label="택시 요금 계산기 열기"
          size="sm"
          variant="ghost"
          onPress={onOpenTaxiFare}
        />
      </Card>

      <Card>
        <Label weight="700" size={17}>
          지금 열차가 다니나요
        </Label>
        <Label muted size={13}>
          지연·운행 중지를 공식·실시간 페이지에서 확인해요. 빨간 글씨가 없으면
          평소대로 다니는 거예요.
        </Label>
        {railInfoLinks.map((link) => (
          <Button
            key={link.url}
            label={link.label}
            icon="open-outline"
            variant="ghost"
            onPress={() => {
              setError("");
              void openTravelLink(link.url).catch((e: Error) =>
                setError(e.message),
              );
            }}
          />
        ))}
        <Label muted size={12}>
          역 화면의 「運転見合わせ」는 운행 중지, 「遅延」은 지연이에요. 늦어서
          일정이 틀어지면 역 개찰구에서 「遅延証明書(지연 증명서)」를 받을 수
          있어요.
        </Label>
      </Card>

      <ShowCard
        heading="택시 기사에게 보여주세요"
        content={show}
        onClose={() => setShow(null)}
      />
    </View>
  );
}
