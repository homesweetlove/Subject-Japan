import { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import * as Location from "expo-location";
import { Button, Card, Label } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { couponCatalog as coupons } from "./catalog";
import { findNearby, type NearbyStore } from "./nearby";
export function NearbyScreen() {
  const [manual, setManual] = useState(false);
  const [region, setRegion] = useState("東京");
  const [merchant, setMerchant] = useState("ビックカメラ");
  const [stores, setStores] = useState<NearbyStore[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [searched, setSearched] = useState(false);
  const controller = useRef<AbortController | null>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  const search = async () => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setStores([]);
    setSearched(false);
    const cancel = new AbortController();
    controller.current = cancel;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!alive.current || cancel.signal.aborted) return;
      if (!permission.granted)
        throw new Error(
          "위치 권한이 없어요. 쿠폰 목록의 공식 매장 안내를 이용해 주세요.",
        );
      const point = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "현재 위치를 찾지 못했어요. 위치 설정을 확인해 주세요.",
                ),
              ),
            15000,
          );
        }),
      ]);
      if (!alive.current || cancel.signal.aborted) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => cancel.abort(), 25000);
      const results = await findNearby(point.coords, cancel.signal);
      if (alive.current) {
        setStores(results);
        setSearched(true);
      }
    } catch (e) {
      if (alive.current)
        setNotice(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "검색 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.",
        );
    } finally {
      clearTimeout(timeout);
      if (alive.current) setBusy(false);
    }
  };
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setNotice("링크를 열지 못했어요.");
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <Label size={28} weight="700">
        가까운 매장, 쓸 수 있는 혜택
      </Label>
      <Card>
        <Label>검색할 때 위치를 받아 반경 2km의 매장을 찾아요.</Label>
        <Label muted size={13}>
          아래 버튼을 누르면 약 100m 단위로 줄인 좌표를 OpenStreetMap Overpass
          서버에 보내요. 위치와 검색 결과는 기기에 저장하지 않아요.
        </Label>
        <Button
          label="위치 전송에 동의하고 주변 검색"
          primary
          busy={busy}
          onPress={() => void search()}
        />
      </Card>
      {!!notice && <Label>{notice}</Label>}
      <Button
        label="위치 권한 없이 지역·매장으로 찾기"
        onPress={() => setManual(!manual)}
      />
      {manual && (
        <Card>
          <Label weight="700">지역과 매장 이름으로 검색</Label>
          <Label muted size={13}>
            현재 위치를 요청하지 않아요. 선택한 지역과 입력한 매장 이름만 Google
            Maps에 전달해요. 지점의 혜택 적용 여부는 공식 쿠폰에서 확인해
            주세요.
          </Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["도쿄", "東京"],
              ["오사카", "大阪"],
              ["후쿠오카", "福岡"],
              ["삿포로", "札幌"],
              ["나고야", "名古屋"],
            ].map(([label, value]) => (
              <Choice
                key={value}
                label={label}
                selected={region === value}
                onPress={() => setRegion(value)}
              />
            ))}
          </View>
          <Field
            label="찾을 매장 이름"
            value={merchant}
            onChange={setMerchant}
            maxLength={80}
          />
          <Button
            label="선택한 지역의 매장을 지도에서 찾기"
            disabled={!merchant.trim()}
            onPress={() =>
              void open(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${region} ${merchant.trim()}`)}`,
              )
            }
          />
        </Card>
      )}
      {searched && !stores.length && (
        <Label>
          지도 데이터에서 해당 매장을 찾지 못했어요. 모든 지점이 등록된 것은
          아니에요.
        </Label>
      )}
      {!!stores.length && (
        <Label muted size={12}>
          지도상 매장과 브랜드 혜택을 연결한 후보예요. 지점별 사용 가능
          여부·면세 자격·제외 조건은 쿠폰 상세와 매장에서 확인해 주세요.
        </Label>
      )}
      {stores.map((s) => (
        <Card key={s.id}>
          <Label weight="700">{s.name}</Label>
          <Label muted>직선거리 약 {Math.round(s.distance / 10) * 10}m</Label>
          {s.couponIds.map((id) => {
            const c = coupons.find((c) => c.id === id)!;
            return (
              <View key={id} style={{ gap: 6 }}>
                <Label size={14}>
                  {c.title} · {c.benefit}
                </Label>
                <Label muted size={12}>
                  {c.stores}
                </Label>
                <Button
                  label={`${s.name} ${c.title} 공식 조건 확인`}
                  onPress={() => void open(c.officialUrl)}
                />
              </View>
            );
          })}
          <Button
            label={`${s.name} 길찾기`}
            onPress={() =>
              void open(
                `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`,
              )
            }
          />
        </Card>
      ))}
      <Button
        label="지도 데이터 © OpenStreetMap contributors"
        onPress={() => void open("https://www.openstreetmap.org/copyright")}
      />
    </View>
  );
}
