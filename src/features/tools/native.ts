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
  recognizeImage: (uri: string, language: Language) =>
    required().recognizeImage(uri, language),
  listen: async (language: Language, isCurrent: () => boolean = () => true) => {
    const api = required();
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error("설정에서 마이크 권한을 허용해 주세요.");
    }
    if (!isCurrent()) throw new Error("음성 인식을 취소했어요.");
    return api.listen(language);
  },
  stopListening: () => native?.stopListening() ?? Promise.resolve(),
  scanCard: () => required().scanCard(),
  cancel: () => native?.cancel() ?? Promise.resolve(),
};
