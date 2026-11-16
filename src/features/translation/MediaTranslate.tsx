import { useEffect, useRef, useState } from "react";
import { AppState, Keyboard, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import type { Language, LocalState, Translation } from "../../domain/models";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { Field } from "../../ui/Field";
import { useTheme } from "../../ui/theme";
import { travelTools } from "../tools/native";
import { translateText } from "./service";
import { translationProvider } from "./provider";
import {
  TranslationDisplay,
  translationLanguage,
} from "../../ui/TranslationDisplay";
import { sameTranslation } from "../../storage/state";
export function MediaTranslate({
  mode,
  state,
  onRecord,
  onFavorite,
}: {
  mode: "camera" | "voice";
  state: LocalState;
  onRecord: (t: Translation) => Promise<void>;
  onFavorite: (t: Translation) => Promise<void>;
}) {
  const c = useTheme();
  const [source, setSource] = useState<Language>(
    mode === "camera" ? "ja" : "ko",
  );
  const [text, setText] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [listening, setListening] = useState(false),
    [fullscreen, setFullscreen] = useState(false);
  const [turns, setTurns] = useState<Translation[]>([]);
  const [actionBusy, setActionBusy] = useState(false);
  const actionPending = useRef(false);
  const operation = useRef<
    "picture" | "listen" | "translate" | "cancel" | null
  >(null);
  const playback = useRef(0);
  const recognitionStarted = useRef(false);
  const active = useRef(
    AppState.currentState == null || AppState.currentState === "active",
  );
  const sequence = useRef(0),
    alive = useRef(true),
    imagePath = useRef<string | null>(null);
  const clearImage = () => {
    if (imagePath.current) {
      try {
        if (imagePath.current.startsWith(Paths.cache.uri))
          new File(imagePath.current).delete();
      } catch {}
      imagePath.current = null;
    }
  };
  const stopSpeech = () => {
    playback.current++;
    return Speech.stop();
  };
  const cancelListening = async () => {
    if (operation.current !== "listen") return;
    const token = ++sequence.current;
    operation.current = "cancel";
    setListening(false);
    setBusy(true);
    setNotice("음성 인식을 취소했어요.");
    try {
      await travelTools.cancel();
    } catch {
      if (alive.current && token === sequence.current)
        setNotice("음성 인식을 종료하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (alive.current && token === sequence.current) {
        operation.current = null;
        setBusy(false);
      }
    }
  };
  useEffect(() => {
    alive.current = true;
    const sub = AppState.addEventListener("change", (s) => {
      active.current = s === "active";
      if (s !== "active") {
        void stopSpeech().catch(() => {});
        // Camera and system permission sheets may temporarily make us inactive.
        if (s === "background") void cancelListening();
      }
    });
    return () => {
      alive.current = false;
      sequence.current++;
      void travelTools.cancel().catch(() => {});
      void stopSpeech().catch(() => {});
      clearImage();
      sub.remove();
    };
  }, []);
  const picture = async (camera: boolean) => {
    if (operation.current) return;
    if (!travelTools.available) {
      setNotice("사진 번역은 전용 Android·iPhone 앱에서 사용할 수 있어요.");
      return;
    }
    const token = ++sequence.current;
    operation.current = "picture";
    Keyboard.dismiss();
    setBusy(true);
    setNotice("");
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error("설정에서 카메라 권한을 허용해 주세요.");
      }
      if (!alive.current || token !== sequence.current) return;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.85,
        exif: false,
        base64: false,
      };
      const image = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (image.canceled) return;
      const uri = image.assets[0].uri;
      if (!alive.current || token !== sequence.current) {
        try {
          if (uri.startsWith(Paths.cache.uri)) new File(uri).delete();
        } catch {}
        return;
      }
      clearImage();
      imagePath.current = uri;
      const read = await travelTools.recognizeImage(uri, source);
      clearImage();
      if (!alive.current || token !== sequence.current) return;
      setText(read);
      setNotice(
        !read.trim()
          ? "글자를 찾지 못했어요. 밝은 곳에서 글자에 가까이 촬영해 주세요."
          : read.length > 2000
            ? "2,000자가 넘어요. 번역할 부분을 남기고 편집해 주세요."
            : "읽은 글자를 확인하고 번역해 주세요. 세로쓰기·작은 글자는 틀릴 수 있어요.",
      );
    } catch (e) {
      if (alive.current && token === sequence.current)
        setNotice(
          e instanceof Error
            ? e.message
            : "사진을 읽지 못했어요. 다시 시도해 주세요.",
        );
      clearImage();
    } finally {
      if (alive.current && token === sequence.current) {
        operation.current = null;
        setBusy(false);
      }
    }
  };
  const listen = async () => {
    if (operation.current) return;
    if (!travelTools.available) {
      setNotice("이 기능은 전용 Android·iPhone 앱에서 사용할 수 있어요.");
      return;
    }
    const token = ++sequence.current;
    operation.current = "listen";
    recognitionStarted.current = false;
    Keyboard.dismiss();
    setListening(true);
    setNotice("말씀한 뒤 ‘말하기 끝’을 눌러 주세요.");
    try {
      await stopSpeech();
      if (!alive.current || token !== sequence.current || !active.current)
        return;
      recognitionStarted.current = true;
      const heard = await travelTools.listen(
        source,
        () => alive.current && token === sequence.current,
      );
      if (!alive.current || token !== sequence.current) return;
      setText(heard);
      setNotice("인식한 문장을 확인한 뒤 번역해 주세요.");
    } catch (e) {
      if (alive.current && token === sequence.current)
        setNotice(
          e instanceof Error
            ? e.message
            : "음성을 인식하지 못했어요. 다시 시도해 주세요.",
        );
    } finally {
      if (alive.current && token === sequence.current) {
        operation.current = null;
        recognitionStarted.current = false;
        setListening(false);
      }
    }
  };
  const translate = async () => {
    if (operation.current) return;
    const token = ++sequence.current;
    operation.current = "translate";
    Keyboard.dismiss();
    setBusy(true);
    setNotice("");
    try {
      const result = await translateText({
        text,
        source,
        profile: state.profile,
        provider: translationProvider,
      });
      if (token !== sequence.current) return;
      setTurns((t) => [result, ...t].slice(0, 30));
      try {
        await onRecord(result);
      } catch {
        if (alive.current && token === sequence.current)
          setNotice("번역은 준비했지만 기록을 저장하지 못했어요.");
      }
    } catch (e) {
      if (alive.current && token === sequence.current)
        setNotice(
          e instanceof Error
            ? e.message
            : "번역하지 못했어요. 다시 시도해 주세요.",
        );
    } finally {
      if (alive.current && token === sequence.current) {
        operation.current = null;
        setBusy(false);
      }
    }
  };
  const run = async (action: () => Promise<unknown>) => {
    if (actionPending.current) return;
    actionPending.current = true;
    setActionBusy(true);
    setNotice("");
    const token = sequence.current;
    try {
      await action();
    } catch {
      if (alive.current && token === sequence.current)
        setNotice("요청을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {
      actionPending.current = false;
      if (alive.current) setActionBusy(false);
    }
  };
  const speak = async (t: Translation) => {
    if (operation.current === "listen" || operation.current === "cancel")
      return;
    const token = ++playback.current;
    await Speech.stop();
    if (!alive.current || !active.current || token !== playback.current) return;
    Speech.speak(t.translated, {
      language: t.target === "ja" ? "ja-JP" : "ko-KR",
      rate: 0.85,
      onError: () => {
        if (alive.current && token === playback.current)
          setNotice(
            "시스템 음성을 사용할 수 없어요. 기기의 음성팩을 확인해 주세요.",
          );
      },
    });
  };
  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        title={
          mode === "camera" ? "사진 속 말도 가까이" : "한 문장씩, 함께 대화"
        }
        subtitle={
          mode === "camera"
            ? "메뉴판·안내문·영수증·표지판을 촬영하거나 사진에서 골라 주세요. 사진은 서버에 보내지 않아요."
            : "한국어와 일본어를 번갈아 선택하고 말해 주세요. 기기 내 음성 인식을 지원하는 기기·언어에서 사용할 수 있어요."
        }
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["ko", "ja"] as const).map((l) => (
          <Choice
            key={l}
            label={l === "ko" ? "한국어 → 일본어" : "일본어 → 한국어"}
            selected={source === l}
            disabled={busy || listening}
            onPress={() => {
              setSource(l);
              setText("");
            }}
          />
        ))}
      </View>
      <Card>
        {mode === "camera" ? (
          <>
            <Button
              label="카메라로 촬영"
              icon="camera-outline"
              busy={busy}
              onPress={() => void picture(true)}
            />
            <Button
              label="사진에서 선택"
              disabled={busy}
              onPress={() => void picture(false)}
            />
          </>
        ) : (
          <>
            {listening ? (
              <>
                <Button
                  label="말하기 끝"
                  primary
                  disabled={actionBusy}
                  onPress={() => {
                    if (!recognitionStarted.current) void cancelListening();
                    else void run(() => travelTools.stopListening());
                  }}
                />
                <Button
                  label="음성 인식 취소"
                  onPress={() => void cancelListening()}
                />
              </>
            ) : (
              <Button
                label={source === "ko" ? "한국어로 말하기" : "日本語で話す"}
                icon="mic-outline"
                primary
                disabled={busy}
                onPress={() => void listen()}
              />
            )}
            <Label size={12} muted>
              음성은 저장하지 않아요. Android 12 이상과 기기 내 인식 서비스가
              필요하며, iPhone도 해당 언어의 기기 내 인식 지원이 필요해요.
            </Label>
          </>
        )}
        <Field
          label="인식한 문장"
          value={text}
          onChange={setText}
          editable={!busy && !listening}
          multiline
          maxLength={Math.max(2000, text.length)}
        />
        <Label size={12} muted>
          {text.length.toLocaleString()} / 2,000자 · 번역한 문장은 최근 기록에
          저장돼요.
        </Label>
        <Button
          label="인식한 문장 번역"
          primary
          disabled={!text.trim() || text.length > 2000 || listening}
          busy={busy}
          onPress={() => void translate()}
        />
      </Card>
      {!!notice && (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Label>{notice}</Label>
        </View>
      )}
      {turns.map((t, index) => (
        <Card key={t.id}>
          <Label muted>{t.original}</Label>
          <Text
            selectable
            {...translationLanguage(t.target)}
            style={{ fontSize: 24, lineHeight: 36, color: c.ink }}
          >
            {t.translated}
          </Text>
          <Button
            label="번역 음성 듣기"
            disabled={actionBusy || listening}
            onPress={() => void run(() => speak(t))}
          />
          <Button
            label="음성 재생 중지"
            onPress={() =>
              void stopSpeech().catch(() => {
                if (alive.current) setNotice("음성 재생을 중지하지 못했어요.");
              })
            }
          />
          <Button
            label="문장 복사"
            disabled={actionBusy}
            onPress={() =>
              void run(async () => {
                const token = sequence.current;
                const copied = await Clipboard.setStringAsync(t.translated);
                if (alive.current && token === sequence.current)
                  setNotice(
                    copied
                      ? "번역문을 복사했어요."
                      : "복사하지 못했어요. 번역문을 길게 눌러 복사해 주세요.",
                  );
              })
            }
          />
          <Button
            label={
              state.favorites.some((f) => sameTranslation(f, t))
                ? "문장 즐겨찾기 해제"
                : "문장 즐겨찾기"
            }
            disabled={actionBusy}
            onPress={() => void run(() => onFavorite(t))}
          />
          {index === 0 && (
            <Button
              label="상대방에게 크게 보여주기"
              onPress={() => setFullscreen(true)}
            />
          )}
        </Card>
      ))}
      <TranslationDisplay
        value={fullscreen ? (turns[0] ?? null) : null}
        onClose={() => setFullscreen(false)}
      />
    </View>
  );
}
