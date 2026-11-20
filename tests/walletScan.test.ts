import { describe, expect, it } from "vitest";
import { BarcodeFormat, QRCodeWriter } from "@zxing/library";
import { recognizeCode } from "../src/features/membership/recognize";
import { barcodeModules } from "../src/features/membership/barcode";
import {
  makeMembershipCard,
  validMembershipCard,
} from "../src/features/membership/model";
import { bundledFeed, parseCouponFeed } from "../src/features/coupons/catalog";
import { parseCouponSourceStatuses } from "../src/features/coupons/liveStatus";

describe("wallet updates", () => {
  it("preserves QR modules for a long payload through serialization", () => {
    const matrix = new QRCodeWriter().encode(
      "offline-pass/".repeat(45),
      BarcodeFormat.QR_CODE,
      0,
      0,
      new Map(),
    );
    const w = matrix.getWidth(),
      scale = 4,
      size = w * scale;
    const pixels = Uint8ClampedArray.from({ length: size * size }, (_, i) =>
      matrix.get(Math.floor((i % size) / scale), Math.floor(i / size / scale))
        ? 0
        : 255,
    );
    const code = recognizeCode(pixels, size, size);
    let expected = "";
    for (let y = 4; y < w - 4; y++)
      for (let x = 4; x < w - 4; x++) expected += matrix.get(x, y) ? "1" : "0";
    expect(code).toEqual({ kind: "qr", width: w - 8, bits: expected });
    const card = makeMembershipCard({ name: "여행 QR", scannedCode: code });
    expect(validMembershipCard(JSON.parse(JSON.stringify(card)))).toBe(true);
    expect(
      validMembershipCard({ ...card, scannedCode: { ...code, width: 2 } }),
    ).toBe(false);
  });

  it.each(["4006381333931", "PONTA-123"])(
    "reads barcode %s from a rotated photo",
    (value) => {
      const bars = barcodeModules(value).modules.replace(/./g, (c) =>
        c.repeat(3),
      );
      const padded = "0".repeat(36) + bars + "0".repeat(36);
      const pixels = Uint8ClampedArray.from(
        { length: 60 * padded.length },
        (_, i) => (padded[Math.floor(i / 60)] === "1" ? 0 : 255),
      );
      expect(recognizeCode(pixels, 60, padded.length)).toEqual({
        kind: "barcode",
        width: bars.length,
        bits: bars,
      });
    },
  );

  it("rejects invalid feeds and reports a frozen source as stale", () => {
    const item = bundledFeed.items[0];
    expect(() =>
      parseCouponFeed({
        revision: 2,
        items: [{ ...item, officialUrl: "https://example.com/" }],
      }),
    ).toThrow();
    expect(() =>
      parseCouponFeed({ revision: 2, items: [item, item] }),
    ).toThrow();
    const statuses = parseCouponSourceStatuses(
      {
        items: [
          {
            id: "donki-coupon",
            status: "fresh",
            checkedAt: "2026-09-28T00:00:00Z",
          },
        ],
      },
      Date.parse("2026-11-20"),
    );
    expect(statuses["donki-visitor"].state).toBe("stale");
  });
});
