import { describe, expect, it } from "vitest";
import { extractYenCandidates } from "../src/features/pay/yenOcr";

describe("Android shopping OCR suggestion parser", () => {
  it("reads full-width prices on a Japanese tag", () => {
    expect(extractYenCandidates("定価　￥１，９８０\n税込価格 ￥2,178", "price")[0].amount).toBe(2178);
  });
  it("prioritizes payable receipt total over change and tax", () => {
    const receipt = "2026/10/30\nお買上合計 3,500\n消費税 ¥318\nお預り ¥5,000\nお釣 ¥1,500";
    expect(extractYenCandidates(receipt, "receipt").map(x => x.amount)).toEqual([3500]);
  });
  it("accepts currency-marked yen lines and prefers TOTAL", () => {
    const result = extractYenCandidates("パン ¥250\nTOTAL ¥1,250", "receipt");
    expect(result[0].amount).toBe(1250);
    expect(result[1].amount).toBe(250);
  });
  it("does not invent prices from phone numbers and dates", () => {
    expect(extractYenCandidates("TEL 03-1234-5678\n2026/10/30\nレジ 000123", "receipt")).toEqual([]);
  });
  it("limits extreme/invalid amounts without saving anything", () => {
    expect(extractYenCandidates("合計 999999999999\n値札 ¥0", "receipt")).toEqual([]);
  });
});
