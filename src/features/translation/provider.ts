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
let preparation: Promise<void> | null = null;
export const translationProvider: TranslationProvider = {
  id: "기기 내 번역 · ML Kit",
  available: !!native,
  isReady: () => native?.isReady() ?? Promise.resolve(false),
  prepare: () => {
    if (preparation) return preparation;
    const attempt = (async () => {
      if (!native) throw new Error("전용 앱에서 번역팩을 설치할 수 있어요.");
      await native.prepare();
      if (!(await native.isReady()))
        throw new Error("번역팩 설치를 확인하지 못했어요. 다시 시도해 주세요.");
    })();
    preparation = attempt;
    const clear = () => {
      if (preparation === attempt) preparation = null;
    };
    // Both handlers settle normally; a rejected download must not leave an
    // unhandled rejected promise or prevent a later retry.
    void attempt.then(clear, clear);
    return attempt;
  },
  translate: async (text, source, target) => {
    if (!native) throw new Error("기기 내 번역을 사용할 수 없어요.");
    return native.translate(text, source, target);
  },
};
