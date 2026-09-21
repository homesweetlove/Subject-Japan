import type { TranslationProvider } from "./service";
export const translationProvider: TranslationProvider = {
  id: "여행 문장팩",
  available: false,
  isReady: async () => false,
  prepare: async () => {
    throw new Error("번역팩 다운로드는 전용 앱에서 지원해요.");
  },
  translate: async () => {
    throw new Error("자유 입력 번역은 전용 앱에서 지원해요.");
  },
};
