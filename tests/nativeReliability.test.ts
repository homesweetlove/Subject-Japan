import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialState, type SourceLanguage } from "../src/domain/models";
import {
  translateText,
  type TranslationProvider,
} from "../src/features/translation/service";

const mocks = vi.hoisted(() => ({
  travel: {
    capabilities: vi.fn(),
    recognizeImage: vi.fn(),
    listen: vi.fn(),
    stopListening: vi.fn(),
    scanCard: vi.fn(),
    cancel: vi.fn(),
  },
  translator: { isReady: vi.fn(), prepare: vi.fn(), translate: vi.fn() },
  permission: vi.fn(),
  platform: { OS: "android" },
}));
vi.mock("expo", () => ({
  requireOptionalNativeModule: (name: string) =>
    name === "SubjectTravel" ? mocks.travel : mocks.translator,
}));
vi.mock("react-native", () => ({
  Platform: mocks.platform,
  PermissionsAndroid: {
    request: mocks.permission,
    PERMISSIONS: { RECORD_AUDIO: "android.permission.RECORD_AUDIO" },
    RESULTS: { GRANTED: "granted" },
  },
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.platform.OS = "android";
  mocks.permission.mockResolvedValue("granted");
  mocks.travel.cancel.mockResolvedValue(undefined);
  mocks.travel.stopListening.mockResolvedValue(undefined);
  mocks.translator.isReady.mockResolvedValue(true);
});

describe("speech permission and cancellation boundary", () => {
  it("does not request permission for an already stale screen", async () => {
    const { travelTools } = await import("../src/features/tools/native");
    await expect(travelTools.listen("ko", () => false)).rejects.toThrow(/취소/);
    expect(mocks.permission).not.toHaveBeenCalled();
    expect(mocks.travel.listen).not.toHaveBeenCalled();
  });
  it("cancel during permission cannot start the microphone afterward", async () => {
    const permission = deferred<string>();
    mocks.permission.mockReturnValue(permission.promise);
    const { travelTools } = await import("../src/features/tools/native");
    const listening = travelTools.listen("ko");
    const rejected = expect(listening).rejects.toThrow(/취소/);
    await travelTools.cancel();
    permission.resolve("granted");
    await rejected;
    expect(mocks.travel.listen).not.toHaveBeenCalled();
  });
  it("stop during permission cannot start the microphone afterward", async () => {
    const permission = deferred<string>();
    mocks.permission.mockReturnValue(permission.promise);
    const { travelTools } = await import("../src/features/tools/native");
    const listening = travelTools.listen("ko");
    const rejected = expect(listening).rejects.toThrow(/취소/);
    await travelTools.stopListening();
    permission.resolve("granted");
    await rejected;
    expect(mocks.travel.listen).not.toHaveBeenCalled();
  });
  it("rejects overlapping permission requests and still allows the first result", async () => {
    const permission = deferred<string>();
    mocks.permission.mockReturnValue(permission.promise);
    mocks.travel.listen.mockResolvedValue("안녕하세요");
    const { travelTools } = await import("../src/features/tools/native");
    const first = travelTools.listen("ko");
    await expect(travelTools.listen("ja")).rejects.toThrow(/이미/);
    expect(mocks.permission).toHaveBeenCalledTimes(1);
    permission.resolve("granted");
    await expect(first).resolves.toBe("안녕하세요");
  });
  it("rejects denied permission and does not invoke speech", async () => {
    mocks.permission.mockResolvedValue("never_ask_again");
    const { travelTools } = await import("../src/features/tools/native");
    await expect(travelTools.listen("ko")).rejects.toThrow(/마이크 권한/);
    expect(mocks.travel.listen).not.toHaveBeenCalled();
  });
  it("stopping active speech permits final transcription without Android permission on iOS", async () => {
    mocks.platform.OS = "ios";
    const nativeResult = deferred<string>();
    mocks.travel.listen.mockReturnValue(nativeResult.promise);
    const { travelTools } = await import("../src/features/tools/native");
    const first = travelTools.listen("ja");
    await travelTools.stopListening();
    nativeResult.resolve("こんにちは");
    await expect(first).resolves.toBe("こんにちは");
    expect(mocks.permission).not.toHaveBeenCalled();
  });
  it("ignores late native speech success after cancellation and permits a retry", async () => {
    mocks.platform.OS = "ios";
    const oldResult = deferred<string>();
    mocks.travel.listen
      .mockReturnValueOnce(oldResult.promise)
      .mockResolvedValue("새 문장");
    const { travelTools } = await import("../src/features/tools/native");
    const old = travelTools.listen("ko");
    const rejected = expect(old).rejects.toThrow(/취소/);
    await travelTools.cancel();
    const retry = travelTools.listen("ko");
    oldResult.resolve("취소된 문장");
    await rejected;
    await expect(retry).resolves.toBe("새 문장");
  });
  it("does not treat empty native speech as a successful transcript", async () => {
    mocks.travel.listen.mockResolvedValue(" \n ");
    const { travelTools } = await import("../src/features/tools/native");
    await expect(travelTools.listen("ko")).rejects.toThrow(/인식한 말/);
  });
});

describe("local OCR and NFC cancellation", () => {
  it("rejects remote image URIs before calling the native bridge", async () => {
    const { travelTools } = await import("../src/features/tools/native");
    await expect(
      travelTools.recognizeImage("https://example.com/photo.jpg", "ja"),
    ).rejects.toThrow(/사진/);
    expect(mocks.travel.recognizeImage).not.toHaveBeenCalled();
  });
  it("preserves empty OCR for the no-text UI and forwards only URI and language", async () => {
    mocks.travel.recognizeImage.mockResolvedValue("");
    const { travelTools } = await import("../src/features/tools/native");
    await expect(
      travelTools.recognizeImage("file:///cache/image.jpg", "ja"),
    ).resolves.toBe("");
    expect(mocks.travel.recognizeImage).toHaveBeenCalledExactlyOnceWith(
      "file:///cache/image.jpg",
      "ja",
    );
  });
  it("rejects late OCR and NFC success after a screen cancels", async () => {
    const image = deferred<string>(),
      card = deferred<{ id: string; blocks: number[][] }>();
    mocks.travel.recognizeImage.mockReturnValue(image.promise);
    mocks.travel.scanCard.mockReturnValue(card.promise);
    const { travelTools } = await import("../src/features/tools/native");
    const readImage = travelTools.recognizeImage(
      "file:///cache/image.jpg",
      "ja",
    );
    const readCard = travelTools.scanCard();
    const imageRejected = expect(readImage).rejects.toThrow(/취소/);
    const cardRejected = expect(readCard).rejects.toThrow(/취소/);
    await travelTools.cancel();
    image.resolve("古い結果");
    card.resolve({ id: "0123456789abcdef", blocks: [] });
    await Promise.all([imageRejected, cardRejected]);
  });
});

describe("translation success is verified", () => {
  it("shares concurrent downloads and allows a retry after failure", async () => {
    const download = deferred<void>();
    mocks.translator.prepare
      .mockReturnValueOnce(download.promise)
      .mockResolvedValue(undefined);
    const { translationProvider } =
      await import("../src/features/translation/provider");
    const first = translationProvider.prepare(),
      second = translationProvider.prepare();
    expect(first).toBe(second);
    expect(mocks.translator.prepare).toHaveBeenCalledTimes(1);
    const firstRejected = expect(first).rejects.toThrow("download failed");
    const secondRejected = expect(second).rejects.toThrow("download failed");
    download.reject(new Error("download failed"));
    await Promise.all([firstRejected, secondRejected]);
    await expect(translationProvider.prepare()).resolves.toBeUndefined();
    expect(mocks.translator.prepare).toHaveBeenCalledTimes(2);
  });
  it("does not report preparation success when models remain unavailable", async () => {
    mocks.translator.prepare.mockResolvedValue(undefined);
    mocks.translator.isReady.mockResolvedValue(false);
    const { translationProvider } =
      await import("../src/features/translation/provider");
    await expect(translationProvider.prepare()).rejects.toThrow(/설치/);
  });
  it("does not construct a successful translation from an empty result", async () => {
    const provider: TranslationProvider = {
      id: "test",
      available: true,
      isReady: async () => true,
      prepare: async () => {},
      translate: async () => "  ",
    };
    await expect(
      translateText({
        text: "처음 보는 문장",
        source: "ko",
        profile: initialState().profile,
        provider,
      }),
    ).rejects.toThrow(/번역 결과/);
  });
  it("rejects an invalid runtime source before invoking native translation", async () => {
    const translate = vi.fn();
    const provider: TranslationProvider = {
      id: "test",
      available: true,
      isReady: async () => true,
      prepare: async () => {},
      translate,
    };
    await expect(
      translateText({
        text: "처음 보는 문장",
        source: "en" as SourceLanguage,
        profile: initialState().profile,
        provider,
      }),
    ).rejects.toThrow(/직접 선택/);
    expect(translate).not.toHaveBeenCalled();
  });
});
