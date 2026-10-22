import { requireOptionalNativeModule } from "expo";
import { PermissionsAndroid, Platform } from "react-native";
import type { Language } from "../../domain/models";
export interface CardRead {
  id: string;
  blocks: number[][];
}
interface NativeTravel {
  capabilities(): Promise<{ ocr: boolean; nfc: boolean; voice: boolean }>;
  recognizeImage(uri: string, language: Language): Promise<string>;
  listen(language: Language): Promise<string>;
  stopListening(): Promise<void>;
  scanCard(): Promise<CardRead>;
  cancel(): Promise<void>;
}
const native = requireOptionalNativeModule<NativeTravel>("SubjectTravel");
let generation = 0;
let voice: { token: number; listening: boolean } | null = null;
const validLanguage = (language: Language) => {
  if (language !== "ko" && language !== "ja")
    throw new Error("한국어 또는 일본어를 선택해 주세요.");
};
const cancelled = () => new Error("요청을 취소했어요.");
const required = () => {
  if (!native)
    throw new Error("이 기능은 전용 Android·iPhone 앱에서 사용할 수 있어요.");
  return native;
};
export const travelTools = {
  available: !!native,
  capabilities: () =>
    native?.capabilities() ??
    Promise.resolve({ ocr: false, nfc: false, voice: false }),
  recognizeImage: async (uri: string, language: Language) => {
    validLanguage(language);
    if (!/^(file:\/\/|content:\/\/)/i.test(uri))
      throw new Error("기기에서 선택한 사진을 사용해 주세요.");
    const token = generation;
    const text = await required().recognizeImage(uri, language);
    if (token !== generation) throw cancelled();
    if (typeof text !== "string")
      throw new Error("사진에서 글자를 읽지 못했어요.");
    return text;
  },
  listen: async (language: Language, isCurrent: () => boolean = () => true) => {
    validLanguage(language);
    const api = required();
    if (!isCurrent()) throw cancelled();
    if (voice) throw new Error("이미 듣고 있어요.");
    const operation = { token: generation, listening: false };
    voice = operation;
    const current = () =>
      voice === operation && operation.token === generation && isCurrent();
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (!current()) throw cancelled();
        if (granted !== PermissionsAndroid.RESULTS.GRANTED)
          throw new Error("설정에서 마이크 권한을 허용해 주세요.");
      }
      if (!current()) throw cancelled();
      operation.listening = true;
      const text = await api.listen(language);
      if (!current()) throw cancelled();
      if (typeof text !== "string" || !text.trim())
        throw new Error("인식한 말이 없어요.");
      return text;
    } finally {
      if (voice === operation) voice = null;
    }
  },
  stopListening: () => {
    // A permission prompt can outlive the screen or the user's stop action.
    if (voice && !voice.listening) voice = null;
    return native?.stopListening() ?? Promise.resolve();
  },
  scanCard: async () => {
    const token = generation;
    const card = await required().scanCard();
    if (token !== generation) throw cancelled();
    return card;
  },
  cancel: () => {
    generation++;
    voice = null;
    return native?.cancel() ?? Promise.resolve();
  },
};
