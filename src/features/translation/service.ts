import type {
  Language,
  Profile,
  SourceLanguage,
  Translation,
} from "../../domain/models";
import { findPhrase } from "../phrases/phrases";

export interface TranslationProvider {
  readonly id: string;
  readonly available: boolean;
  isReady(): Promise<boolean>;
  prepare(): Promise<void>;
  translate(text: string, source: Language, target: Language): Promise<string>;
}
export function detectLanguage(text: string): Language | null {
  const korean = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(text);
  const japanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
  if (korean && japanese) return null;
  if (korean) return "ko";
  if (japanese) return "ja";
  return null;
}
export const opposite = (language: Language): Language =>
  language === "ko" ? "ja" : "ko";

export async function translateText(input: {
  text: string;
  source: SourceLanguage;
  profile: Profile;
  provider: TranslationProvider;
}): Promise<Translation> {
  const text = input.text.trim();
  if (!text) throw new Error("번역할 문장을 입력해 주세요.");
  if (text.length > 2000)
    throw new Error("한 번에 2,000자까지 번역할 수 있어요.");
  const source = input.source === "auto" ? detectLanguage(text) : input.source;
  if (!source)
    throw new Error(
      "언어를 확실히 구분하기 어려워요. 한국어 또는 일본어를 직접 선택해 주세요.",
    );
  const target = opposite(source);
  const phrase = findPhrase(text, source, input.profile);
  let translated: string;
  let provider: string;
  if (phrase) {
    translated = phrase[target];
    provider = "여행 문장팩";
  } else {
    if (!input.provider.available)
      throw new Error(
        "자유 입력 번역은 Android·iPhone 전용 앱에서 사용할 수 있어요. 여기서는 아래 여행 문장을 이용해 주세요.",
      );
    if (!(await input.provider.isReady()))
      throw new Error(
        "먼저 상단에서 한국어·일본어 번역팩을 다운로드해 주세요.",
      );
    translated = await input.provider.translate(text, source, target);
    provider = input.provider.id;
  }
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    source,
    target,
    original: text,
    translated,
    provider,
    createdAt: Date.now(),
  };
}
