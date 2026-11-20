/** Original QR modules or a decoded barcode scanline, without surrounding photo content. */
export interface ScannedCode {
  kind: "qr" | "barcode";
  width: number;
  bits: string;
}

export function validScannedCode(value: unknown): value is ScannedCode {
  if (!value || typeof value !== "object") return false;
  const { kind, width, bits } = value as ScannedCode;
  if (!Number.isInteger(width) || typeof bits !== "string") return false;
  const validSize =
    kind === "qr"
      ? width >= 21 &&
        width <= 177 &&
        (width - 21) % 4 === 0 &&
        bits.length === width * width
      : kind === "barcode" &&
        width >= 8 &&
        width <= 1800 &&
        bits.length === width;
  return validSize && !/[^01]/.test(bits) && bits.includes("1");
}
