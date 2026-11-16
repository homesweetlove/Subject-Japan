/** OCR provides suggestions only; shoppers must confirm the amount before saving. */
export interface YenCandidate {
  amount: number;
  line: string;
  score: number;
}
export type ScanPurpose = "price" | "receipt";

const summaryWords =
  /合計|総額|お支払|お買上|現計|TOTAL|AMOUNT\s+DUE|税込合計/i;
const priceWords = /価格|値札|定価|税込|本体価格|PRICE|販売価格/i;
const excludedWords =
  /お釣|釣銭|お預り|預り|消費税|税額|値引|割引|ポイント|クーポン|電話|TEL|伝票番号|会員番号|小計/i;
const datePattern = /\b\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\b/;

/** Never infer tax status, category, merchant, or transaction date from OCR. */
export function extractYenCandidates(
  raw: string,
  purpose: ScanPurpose,
): YenCandidate[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const normalized = raw.slice(0, 12000).normalize("NFKC");
  const found = new Map<number, YenCandidate>();
  for (const sourceLine of normalized.split(/\r?\n/).slice(0, 120)) {
    const line = sourceLine.trim().replace(/\s+/g, " ").slice(0, 180);
    if (!line || datePattern.test(line) || /\d{2}:\d{2}/.test(line)) continue;
    const isSummary = summaryWords.test(line);
    const isPrice = priceWords.test(line);
    const isExcluded = excludedWords.test(line);
    const explicit = /(?:[¥￥]\s*|JPY\s*)(\d[\d,]*)(?![\d,])|(\d[\d,]*)\s*円/gi;
    const candidates: Array<{ amount: number; marked: boolean }> = [];
    let match: RegExpExecArray | null;
    while ((match = explicit.exec(line)) !== null) {
      const value = Number((match[1] ?? match[2]).replace(/,/g, ""));
      candidates.push({ amount: value, marked: true });
    }
    // Many receipts show "合計 1,980" without a currency symbol.
    if (!candidates.length && (isSummary || isPrice)) {
      const amountMatch = line.match(
        /(?:^|[^\d.,])((?:\d{1,3}(?:,\d{3})+|\d{3,8}))(?![\d,.%])/g,
      );
      for (const fragment of amountMatch ?? []) {
        const digits = fragment.match(/\d[\d,]*/)?.[0] ?? "";
        candidates.push({
          amount: Number(digits.replace(/,/g, "")),
          marked: false,
        });
      }
    }
    for (const { amount, marked } of candidates) {
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000)
        continue;
      // Prefer the payable total on a receipt, or the tax-inclusive price on a tag.
      const score =
        (isSummary ? (purpose === "receipt" ? 10 : 2) : 0) +
        (isPrice ? (purpose === "price" ? 8 : 2) : 0) +
        (marked ? 3 : 0) -
        (isExcluded ? 12 : 0);
      if (isExcluded && !isSummary && !isPrice) continue;
      const current = found.get(amount);
      if (!current || score > current.score)
        found.set(amount, { amount, line, score });
    }
  }
  return [...found.values()]
    .sort((a, b) => b.score - a.score || b.amount - a.amount)
    .slice(0, 6);
}
