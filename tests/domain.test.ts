import { describe, expect, it, vi } from "vitest";
import { initialState, type Translation } from "../src/domain/models";
import {
  categories,
  phrases,
  resolvePhrase,
} from "../src/features/phrases/phrases";
import {
  detectLanguage,
  translateText,
  type TranslationProvider,
} from "../src/features/translation/service";
import {
  decodeState,
  recordTranslation,
  toggleFavorite,
} from "../src/storage/state";

const provider = (available: boolean = true) =>
  ({
    id: "test engine",
    available,
    isReady: vi.fn(async () => true),
    prepare: vi.fn(async () => {}),
    translate: vi.fn(
      async (_text: string, _source: string, _target: string) => "テスト結果",
    ),
  }) satisfies TranslationProvider;
const translation = (n = 0): Translation => ({
  id: `id-${n}`,
  source: "ko",
  target: "ja",
  original: `문장 ${n}`,
  translated: `翻訳 ${n}`,
  provider: "test",
  createdAt: n,
});
describe("language and provider boundary", () => {
  it.each([
    ["안녕하세요", "ko"],
    ["カード", "ja"],
    ["免税", "ja"],
    ["44 M", null],
    ["안녕 こんにちは", null],
  ])("detects %s conservatively", (text, language) =>
    expect(detectLanguage(text)).toBe(language),
  );
  it("rejects ambiguous automatic input before calling native code", async () => {
    const engine = provider();
    await expect(
      translateText({
        text: "44",
        source: "auto",
        profile: initialState().profile,
        provider: engine,
      }),
    ).rejects.toThrow("직접 선택");
    expect(engine.translate).not.toHaveBeenCalled();
  });
  it("passes only text and language pair to provider, never the profile", async () => {
    const engine = provider();
    const profile = initialState().profile;
    profile.nickname = "private name";
    const result = await translateText({
      text: "  내일 몇 시에 문을 여나요? ",
      source: "auto",
      profile,
      provider: engine,
    });
    expect(engine.translate).toHaveBeenCalledExactlyOnceWith(
      "내일 몇 시에 문을 여나요?",
      "ko",
      "ja",
    );
    expect(result.translated).toBe("テスト結果");
  });
  it("supports Japanese to Korean", async () => {
    const engine = provider();
    await translateText({
      text: "明日は何時に開きますか",
      source: "ja",
      profile: initialState().profile,
      provider: engine,
    });
    expect(engine.translate).toHaveBeenCalledWith(
      "明日は何時に開きますか",
      "ja",
      "ko",
    );
  });
  it("does not silently download or fake unavailable translation", async () => {
    const engine = provider();
    engine.available = false;
    await expect(
      translateText({
        text: "처음 보는 문장",
        source: "ko",
        profile: initialState().profile,
        provider: engine,
      }),
    ).rejects.toThrow("전용 앱");
    expect(engine.prepare).not.toHaveBeenCalled();
    engine.available = true;
    engine.isReady.mockResolvedValue(false);
    await expect(
      translateText({
        text: "처음 보는 문장",
        source: "ko",
        profile: initialState().profile,
        provider: engine,
      }),
    ).rejects.toThrow("다운로드");
    expect(engine.translate).not.toHaveBeenCalled();
  });
  it.each(["", " ".repeat(10), "가".repeat(2001)])(
    "validates input length",
    async (text) => {
      await expect(
        translateText({
          text,
          source: "ko",
          profile: initialState().profile,
          provider: provider(),
        }),
      ).rejects.toThrow();
    },
  );
});
describe("local personalized phrase pack", () => {
  it("covers every travel category with distinct IDs", () => {
    expect(new Set(phrases.map((p) => p.id)).size).toBe(phrases.length);
    expect(new Set(phrases.map((p) => p.category))).toEqual(
      new Set(categories),
    );
  });
  it("requires a real saved size and never converts country standards", () => {
    const profile = initialState().profile;
    const phrase = phrases.find((p) => p.id === "top")!;
    expect(resolvePhrase(phrase, profile)).toBeNull();
    profile.sizes.top = "44";
    expect(resolvePhrase(phrase, profile)?.ja).toBe(
      "この商品の44サイズはありますか？",
    );
    profile.sizes.top = "$&";
    expect(resolvePhrase(phrase, profile)?.ja).toBe(
      "この商品の$&サイズはありますか？",
    );
  });
  it("translates built-in phrases both ways without an engine", async () => {
    const engine = provider();
    engine.available = false;
    const profile = initialState().profile;
    profile.sizes.top = "44";
    const result = await translateText({
      text: "이 제품 44 사이즈도 있나요?",
      source: "auto",
      profile,
      provider: engine,
    });
    const reverse = await translateText({
      text: result.translated,
      source: "auto",
      profile,
      provider: engine,
    });
    expect(reverse.translated).toBe("이 제품 44 사이즈도 있나요?");
    expect(engine.translate).not.toHaveBeenCalled();
    expect(engine.isReady).not.toHaveBeenCalled();
  });
});
describe("local data durability", () => {
  it("round trips profile, theme, history and bookmarks", () => {
    const state = initialState();
    state.onboarded = true;
    state.theme = "dark";
    state.profile.sizes.top = "44";
    expect(
      decodeState(
        JSON.stringify(
          toggleFavorite(
            recordTranslation(state, translation()),
            translation(),
          ),
        ),
      ),
    ).toMatchObject({
      onboarded: true,
      theme: "dark",
      profile: { sizes: { top: "44" } },
      history: [translation()],
      favorites: [translation()],
    });
  });
  it("deduplicates and limits recent history without losing favorites", () => {
    let state = toggleFavorite(initialState(), translation());
    for (let n = 0; n < 110; n++)
      state = recordTranslation(state, translation(n));
    state = recordTranslation(state, { ...translation(109), id: "new-id" });
    expect(state.history).toHaveLength(100);
    expect(state.history[0].id).toBe("new-id");
    expect(state.favorites).toEqual([translation()]);
    expect(
      toggleFavorite(state, { ...translation(), id: "other-id" }).favorites,
    ).toEqual([]);
  });
  it("rejects corrupt/future data rather than silently overwriting it", () => {
    expect(() => decodeState("{")).toThrow();
    expect(() => decodeState('{"version":2}')).toThrow();
    expect(decodeState(null)).toEqual(initialState());
    expect(decodeState('{"version":1,"history":[{},null]}').history).toEqual(
      [],
    );
  });
  it("prevents unbounded favorite storage without dropping old favorites", () => {
    const state = initialState();
    state.favorites = Array.from({ length: 100 }, (_, n) => translation(n));
    expect(() => toggleFavorite(state, translation(200))).toThrow("100개");
    expect(toggleFavorite(state, translation(0)).favorites).toHaveLength(99);
  });
});
