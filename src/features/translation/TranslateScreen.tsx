import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  languageNames,
  type LocalState,
  type SourceLanguage,
  type Translation,
} from "../../domain/models";
import {
  categories,
  phrases,
  resolvePhrase,
  type Category,
  type Phrase,
} from "../phrases/phrases";
import { sameTranslation } from "../../storage/state";
import {
  ScreenHeader,
  Button,
  Card,
  Icon,
  IconButton,
  Label,
  styles,
} from "../../ui/components";
import { elevation, useTheme } from "../../ui/theme";
import { detectLanguage, opposite, translateText } from "./service";
import { translationProvider } from "./provider";
import { Choice } from "../../ui/Choice";
import type { Register } from "../phrases/register";

export function TranslateScreen({
  state,
  onRecord,
  onFavorite,
  onProfile,
  onClearHistory,
}: {
  state: LocalState;
  onRecord: (t: Translation) => Promise<void>;
  onFavorite: (t: Translation) => Promise<void>;
  onProfile: () => void;
  onClearHistory: () => Promise<void>;
}) {
  const c = useTheme();
  const [text, setText] = useState("");
  const [source, setSource] = useState<SourceLanguage>("auto");
  const [result, setResult] = useState<Translation | null>(null);
  const [category, setCategory] = useState<Category>("쇼핑");
  const [register, setRegister] = useState<Register>("polite");
  const [library, setLibrary] = useState<"phrases" | "history" | "favorites">(
    "phrases",
  );
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const request = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    translationProvider
      .isReady()
      .then((value) => {
        if (alive.current) setReady(value);
      })
      .catch(() => {});
    return () => {
      alive.current = false;
      request.current++;
    };
  }, []);
  const invalidate = () => {
    request.current++;
    setBusy(false);
    setResult(null);
    setNotice("");
  };
  const translate = async () => {
    const sequence = ++request.current;
    setBusy(true);
    setNotice("");
    setResult(null);
    try {
      const value = await translateText({
        text,
        source,
        profile: state.profile,
        provider: translationProvider,
      });
      if (sequence !== request.current) return;
      setResult(value);
      await onRecord(value);
    } catch (error) {
      if (sequence === request.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "번역을 완료하지 못했어요. 다시 시도해 주세요.",
        );
    } finally {
      if (sequence === request.current) setBusy(false);
    }
  };
  const copy = async (value: string) => {
    try {
      const copied = await Clipboard.setStringAsync(value);
      setNotice(
        copied
          ? "번역문을 복사했어요."
          : "복사하지 못했어요. 번역문을 길게 눌러 복사해 주세요.",
      );
    } catch {
      setNotice("복사하지 못했어요. 번역문을 길게 눌러 복사해 주세요.");
    }
  };
  const favorite = async (value: Translation) => {
    try {
      await onFavorite(value);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "즐겨찾기를 저장하지 못했어요.",
      );
    }
  };
  const choosePhrase = async (phrase: Phrase) => {
    const pair = resolvePhrase(phrase, state.profile, register);
    if (!pair) {
      onProfile();
      return;
    }
    invalidate();
    const from = source === "ja" ? "ja" : "ko";
    const to = opposite(from);
    const value: Translation = {
      id: `${Date.now()}-${phrase.id}`,
      original: pair[from],
      translated: pair[to],
      source: from,
      target: to,
      provider: "여행 문장팩",
      createdAt: Date.now(),
    };
    setText(pair[from]);
    setSource(from);
    setResult(value);
    try {
      await onRecord(value);
    } catch {
      setNotice("문장은 준비했지만 기록을 저장하지 못했어요.");
    }
  };
  const detected = source === "auto" ? detectLanguage(text) : source;
  const starred =
    result && state.favorites.some((t) => sameTranslation(t, result));
  return (
    <View style={{ gap: 24 }}>
      <ScreenHeader
        eyebrow="YOUR WORDS, A LITTLE CLOSER"
        title="말이 통하는 여행"
        trailing={
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: c.accentSoft,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: c.accent, fontSize: 22, fontWeight: "700" }}>
              あ
            </Text>
          </View>
        }
      />
      <View style={{ gap: 10 }}>
        <View style={styles.between}>
          <View style={[styles.row, { flex: 1 }]}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: c.accent,
              }}
            />
            <Label size={12} muted>
              {ready
                ? "오프라인 번역 준비 완료"
                : translationProvider.available
                  ? "한국어 · 일본어 번역팩"
                  : "오프라인 여행 문장팩 사용 중"}
            </Label>
          </View>
          {translationProvider.available && !ready && (
            <Button
              label={preparing ? "다운로드 중" : "다운로드"}
              busy={preparing}
              onPress={async () => {
                setPreparing(true);
                setNotice(
                  "Wi-Fi 연결을 유지해 주세요. 처음 설치할 때는 몇 분 걸릴 수 있어요.",
                );
                try {
                  await translationProvider.prepare();
                  const installed = await translationProvider.isReady();
                  if (alive.current) {
                    setReady(installed);
                    setNotice(
                      installed
                        ? "이제 인터넷 없이 번역할 수 있어요."
                        : "번역팩 설치를 확인하지 못했어요. 다시 시도해 주세요.",
                    );
                  }
                } catch {
                  if (alive.current)
                    setNotice(
                      "번역팩을 설치하지 못했어요. Wi-Fi와 저장 공간을 확인해 주세요.",
                    );
                } finally {
                  if (alive.current) setPreparing(false);
                }
              }}
            />
          )}
        </View>
        {!translationProvider.available && (
          <Label size={12} muted>
            자유 입력 번역은 Android·iPhone 전용 앱에서 지원해요.
          </Label>
        )}
      </View>
      <View
        style={[
          {
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: c.surface,
          },
          elevation(c, 2),
        ]}
      >
        <View style={{ padding: 20, gap: 18 }}>
          <View style={styles.between}>
            <View style={[styles.row, { flexWrap: "wrap", flex: 1, gap: 6 }]}>
              {(["auto", "ko", "ja"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    value === "auto"
                      ? "입력 언어 자동 감지"
                      : `${languageNames[value]} 입력`
                  }
                  accessibilityState={{ checked: source === value }}
                  onPress={() => {
                    invalidate();
                    setSource(value);
                  }}
                  style={{
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 13,
                    backgroundColor:
                      source === value ? c.selected : "transparent",
                  }}
                >
                  <Label
                    size={13}
                    weight={source === value ? "700" : "500"}
                    muted={source !== value}
                    style={source === value && { color: c.onSelected }}
                  >
                    {value === "auto" ? "자동 감지" : languageNames[value]}
                  </Label>
                </Pressable>
              ))}
            </View>
            <IconButton
              name="swap-vertical"
              label="원문과 번역문 바꾸기"
              onPress={() => {
                if (result) {
                  const previous = result;
                  invalidate();
                  setSource(previous.target);
                  setText(previous.translated);
                  setResult({
                    ...previous,
                    id: `${Date.now()}-swap`,
                    source: previous.target,
                    target: previous.source,
                    original: previous.translated,
                    translated: previous.original,
                  });
                } else if (!text.trim()) {
                  invalidate();
                  setSource(source === "ja" ? "ko" : "ja");
                } else
                  setNotice("번역을 마치면 원문과 번역문을 바꿀 수 있어요.");
              }}
            />
          </View>
          <TextInput
            accessibilityLabel="번역할 문장"
            multiline
            value={text}
            maxLength={2000}
            textAlignVertical="top"
            placeholder={
              "어떤 말을 전하고 싶으세요?\n한국어 또는 일본어로 입력하세요."
            }
            placeholderTextColor={c.muted}
            onChangeText={(value) => {
              invalidate();
              setText(value);
            }}
            style={{
              color: c.ink,
              fontSize: 20,
              lineHeight: 32,
              minHeight: 130,
              padding: 0,
            }}
          />
          <View style={styles.between}>
            <Label muted size={11}>
              {text.length.toLocaleString()} / 2,000
            </Label>
            <View style={styles.row}>
              {!!text && (
                <IconButton
                  name="close-outline"
                  label="입력 지우기"
                  onPress={() => {
                    invalidate();
                    setText("");
                  }}
                />
              )}
              <Button
                label="번역하기"
                primary
                icon="arrow-forward"
                disabled={!text.trim()}
                busy={busy}
                onPress={() => void translate()}
              />
            </View>
          </View>
        </View>
        <View
          style={{
            padding: 22,
            gap: 16,
            minHeight: 180,
            backgroundColor: result ? c.selected : c.soft,
          }}
        >
          <View style={styles.between}>
            <Label
              size={12}
              weight="700"
              style={{ color: result ? c.accent : c.muted, letterSpacing: 1 }}
            >
              {result
                ? languageNames[result.target]
                : detected
                  ? languageNames[opposite(detected)]
                  : "번역"}
            </Label>
            <Label
              muted
              size={11}
              style={result && { color: c.onSelected, opacity: 0.7 }}
            >
              {result?.provider ?? "가볍게, 자연스럽게"}
            </Label>
          </View>
          <Text
            selectable
            style={{
              color: result ? c.onSelected : c.muted,
              fontSize: result ? 25 : 17,
              lineHeight: result ? 38 : 28,
              fontWeight: result ? "600" : "400",
            }}
          >
            {result?.translated ?? "여행의 다음 대화가\n여기에서 시작됩니다."}
          </Text>
          {result && (
            <View style={styles.between}>
              <Label size={11} style={{ color: c.onSelected, opacity: 0.7 }}>
                번역 결과는 참고용이에요.
              </Label>
              <View style={styles.row}>
                <IconButton
                  name={starred ? "bookmark" : "bookmark-outline"}
                  label={starred ? "즐겨찾기 해제" : "즐겨찾기 저장"}
                  color={c.onSelected}
                  onPress={() => void favorite(result)}
                />
                <IconButton
                  name="copy-outline"
                  label="번역 결과 복사"
                  color={c.onSelected}
                  onPress={() => void copy(result.translated)}
                />
                <IconButton
                  name="expand-outline"
                  label="번역문 크게 보기"
                  color={c.onSelected}
                  onPress={() => setFullscreen(true)}
                />
              </View>
            </View>
          )}
        </View>
      </View>
      {!!notice && (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Label size={13}>{notice}</Label>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="내 사이즈 프로필 열기"
        onPress={onProfile}
        style={{
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          padding: 17,
          borderRadius: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{ backgroundColor: c.soft, padding: 10, borderRadius: 13 }}
        >
          <Icon name="shirt-outline" size={21} />
        </View>
        <View style={{ flex: 1 }}>
          <Label size={14} weight="600">
            {state.profile.nickname ? `${state.profile.nickname}님의` : "나의"}{" "}
            쇼핑 사이즈
          </Label>
          <Label size={12} muted>
            {Object.values(state.profile.sizes).filter(Boolean).join(" · ") ||
              "한 번 저장하고, 일본어 문장에 바로 사용해요"}
          </Label>
        </View>
        <Icon name="chevron-forward" size={17} />
      </Pressable>
      <View style={{ gap: 18 }}>
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderColor: c.line,
            gap: 23,
          }}
        >
          {(["phrases", "history", "favorites"] as const).map((tab, i) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: library === tab }}
              onPress={() => setLibrary(tab)}
              style={{
                paddingBottom: 13,
                borderBottomWidth: library === tab ? 2 : 0,
                borderColor: c.accent,
              }}
            >
              <Label size={15} muted={library !== tab} weight="600">
                {["빠른 문장", "최근 기록", "즐겨찾기"][i]}
              </Label>
            </Pressable>
          ))}
        </View>
        {library === "phrases" ? (
          <>
            <View style={{ gap: 8 }}>
              <Label size={12} muted>
                오프라인 문장팩 · 일본어 표현 선택
              </Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["casual", "polite", "formal"] as const).map((v, i) => (
                  <Choice
                    key={v}
                    label={["캐주얼", "일반 정중", "매우 정중"][i]}
                    selected={register === v}
                    onPress={() => setRegister(v)}
                  />
                ))}
              </View>
              <Label size={12} muted>
                아래 빠른 문장을 고를 때 적용돼요. 자유 입력 번역의 말투는
                변경하지 않아요. 점원에게는 정중한 표현을 권해요.
              </Label>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {categories.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === value }}
                  onPress={() => setCategory(value)}
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    backgroundColor:
                      category === value ? c.selected : c.surface,
                    borderWidth: 1,
                    borderColor: category === value ? c.selected : c.line,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: category === value ? c.onSelected : c.ink,
                    }}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ gap: 10 }}>
              {phrases
                .filter((p) => p.category === category)
                .map((phrase) => {
                  const pair = resolvePhrase(phrase, state.profile, register);
                  return (
                    <Pressable
                      key={phrase.id}
                      accessibilityRole="button"
                      accessibilityLabel={
                        pair?.ko ??
                        `${phrase.sizeKey === "top" ? "상의" : phrase.sizeKey === "bottom" ? "하의" : "신발"} 사이즈 등록하기`
                      }
                      onPress={() => void choosePhrase(phrase)}
                      style={({ pressed }) => ({
                        padding: 19,
                        borderRadius: 18,
                        backgroundColor: pressed ? c.soft : c.surface,
                        borderWidth: 1,
                        borderColor: c.line,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      })}
                    >
                      <View style={{ flex: 1, gap: 5 }}>
                        <Label size={14} weight="500">
                          {pair?.ko ?? "내 사이즈를 등록하면 바로 쓸 수 있어요"}
                        </Label>
                        <Label size={12} muted>
                          {pair?.ja ??
                            (phrase.sizeKey === "top"
                              ? "상의 사이즈 등록"
                              : phrase.sizeKey === "bottom"
                                ? "하의 사이즈 등록"
                                : "신발 사이즈 등록")}
                        </Label>
                      </View>
                      <Icon
                        name={pair ? "arrow-up-outline" : "add-outline"}
                        size={19}
                      />
                    </Pressable>
                  );
                })}
            </View>
          </>
        ) : (
          <>
            {library === "history" && state.history.length > 0 && (
              <Button
                label={
                  confirmClear ? "최근 기록 삭제 확인" : "최근 기록 지우기"
                }
                onPress={async () => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  try {
                    await onClearHistory();
                    setConfirmClear(false);
                  } catch {
                    setNotice("기록을 삭제하지 못했어요.");
                  }
                }}
              />
            )}
            {(library === "history" ? state.history : state.favorites)
              .length === 0 && (
              <Card>
                <Icon
                  name={
                    library === "history" ? "time-outline" : "bookmark-outline"
                  }
                />
                <Label weight="600">
                  {library === "history"
                    ? "첫 대화를 기다리고 있어요"
                    : "다시 쓰고 싶은 말을 모아 보세요"}
                </Label>
                <Label muted size={13}>
                  {library === "history"
                    ? "번역한 문장이 이 기기에 차곡차곡 저장돼요."
                    : "번역 결과의 책갈피를 누르면 여기에 저장돼요."}
                </Label>
              </Card>
            )}
            {(library === "history" ? state.history : state.favorites).map(
              (value) => (
                <Card key={value.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${value.original} 다시 열기`}
                    onPress={() => {
                      invalidate();
                      setSource(value.source);
                      setText(value.original);
                      setResult(value);
                    }}
                  >
                    <Label muted size={13}>
                      {value.original}
                    </Label>
                    <Label size={18}>{value.translated}</Label>
                  </Pressable>
                  <View style={styles.between}>
                    <Label muted size={11}>
                      {new Date(value.createdAt).toLocaleDateString("ko-KR")} ·{" "}
                      {languageNames[value.source]} →{" "}
                      {languageNames[value.target]}
                    </Label>
                    <View style={styles.row}>
                      <IconButton
                        name={
                          state.favorites.some((t) => sameTranslation(t, value))
                            ? "bookmark"
                            : "bookmark-outline"
                        }
                        label={`${value.original} 즐겨찾기 변경`}
                        onPress={() => void favorite(value)}
                      />
                      <IconButton
                        name="copy-outline"
                        label={`${value.original} 번역 복사`}
                        onPress={() => void copy(value.translated)}
                      />
                    </View>
                  </View>
                </Card>
              ),
            )}
          </>
        )}
      </View>
      <Modal
        visible={fullscreen && !!result}
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flex: 1, padding: 28, gap: 30 }}>
            <View style={styles.between}>
              <Label size={12} weight="700">
                SUBJECT:JAPAN
              </Label>
              <Button label="닫기" onPress={() => setFullscreen(false)} />
            </View>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            >
              <Text
                selectable
                style={{
                  color: c.ink,
                  fontSize: 38,
                  lineHeight: 60,
                  fontWeight: "500",
                }}
              >
                {result?.translated}
              </Text>
            </ScrollView>
            <Label muted>{result?.original}</Label>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
