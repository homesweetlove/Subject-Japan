import { requireOptionalNativeModule } from "expo";
import type { Language } from "../../domain/models";
import type { TranslationProvider } from "./service";

interface NativeTranslator {
  isReady(): Promise<boolean>;
  prepare(): Promise<void>;
  translate(text: string, source: Language, target: Language): Promise<string>;
}
const native =
  requireOptionalNativeModule<NativeTranslator>("SubjectTranslator");
export const translationProvider: TranslationProvider = {
  id: "기기 내 번역 · ML Kit",
  available: !!native,
  isReady: () => native?.isReady() ?? Promise.resolve(false),
  prepare: async () => {
    if (!native) throw new Error("전용 앱에서 번역팩을 설치할 수 있어요.");
    await native.prepare();
  },
  translate: async (text, source, target) => {
    if (!native) throw new Error("기기 내 번역을 사용할 수 없어요.");
    return native.translate(text, source, target);
  },
};
