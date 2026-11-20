import BinaryBitmap from "@zxing/library/esm/core/BinaryBitmap";
import HybridBinarizer from "@zxing/library/esm/core/common/HybridBinarizer";
import RGBLuminanceSource from "@zxing/library/esm/core/RGBLuminanceSource";
import QRDetector from "@zxing/library/esm/core/qrcode/detector/Detector";
import BitMatrixParser from "@zxing/library/esm/core/qrcode/decoder/BitMatrixParser";
import DataBlock from "@zxing/library/esm/core/qrcode/decoder/DataBlock";
import GenericGF from "@zxing/library/esm/core/common/reedsolomon/GenericGF";
import ReedSolomonDecoder from "@zxing/library/esm/core/common/reedsolomon/ReedSolomonDecoder";
import MultiFormatOneDReader from "@zxing/library/esm/core/oned/MultiFormatOneDReader";
import BitArray from "@zxing/library/esm/core/common/BitArray";
import type { ScannedCode } from "./scannedCode";

export function recognizeCode(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): ScannedCode {
  const bitmap = new BinaryBitmap(
    new HybridBinarizer(new RGBLuminanceSource(pixels, width, height)),
  );
  const matrix = bitmap.getBlackMatrix();
  const hints = new Map();
  try {
    const symbol = new QRDetector(matrix).detect(hints).getBits();
    // Decoding unmasks its input. Keep the original modules for offline display,
    // including byte segments and encoding indicators that text cannot round-trip.
    const parser = new BitMatrixParser(symbol.clone());
    const version = parser.readVersion();
    const level = parser.readFormatInformation().getErrorCorrectionLevel();
    const blocks = DataBlock.getDataBlocks(
      parser.readCodewords(),
      version,
      level,
    );
    const check = new ReedSolomonDecoder(GenericGF.QR_CODE_FIELD_256);
    for (const block of blocks) {
      const bytes = block.getCodewords();
      check.decode(
        new Int32Array(bytes),
        bytes.length - block.getNumDataCodewords(),
      );
    }
    let bits = "";
    for (let y = 0; y < symbol.getHeight(); y++)
      for (let x = 0; x < symbol.getWidth(); x++)
        bits += symbol.get(x, y) ? "1" : "0";
    return { kind: "qr", width: symbol.getWidth(), bits };
  } catch {
    // Try horizontal and vertical scanlines for one-dimensional codes.
  }
  const reader = new MultiFormatOneDReader(hints);
  for (const vertical of [false, true]) {
    const length = vertical ? height : width;
    const cross = vertical ? width : height;
    const row = new BitArray(length);
    for (let i = 0; i < 63; i++) {
      const offset = Math.ceil(i / 2) * (i % 2 ? -1 : 1);
      const line = Math.floor((cross * (32 + offset)) / 64);
      row.clear();
      for (let p = 0; p < length; p++) {
        if (vertical ? matrix.get(line, p) : matrix.get(p, line)) row.set(p);
      }
      for (const reverse of [false, true]) {
        if (reverse) row.reverse();
        try {
          reader.decodeRow(line, row, hints);
          let bits = "";
          for (let p = 0; p < length; p++) bits += row.get(p) ? "1" : "0";
          bits = bits.replace(/^0+|0+$/g, "");
          return { kind: "barcode", width: bits.length, bits };
        } catch {
          // Keep looking until a row passes the format's decoder.
        }
      }
    }
  }
  throw new Error(
    "QR·바코드를 찾지 못했어요. 코드 하나와 흰 여백이 선명하게 보이는 사진을 선택해 주세요.",
  );
}
