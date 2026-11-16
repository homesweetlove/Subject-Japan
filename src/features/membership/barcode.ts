export type BarcodeKind = "ean13" | "code128";

const CODE128 = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
] as const;

const L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];
const R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];
const PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12))
    throw new Error("EAN-13은 숫자 12~13자리여야 해요.");
  const sum = [...first12].reduce(
    (total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return (10 - (sum % 10)) % 10;
}

export function normalizeEan13(value: string): string | null {
  if (!/^\d{13}$/.test(value)) return null;
  return ean13CheckDigit(value.slice(0, 12)) === Number(value[12])
    ? value
    : null;
}

function ean13Bits(value: string): string {
  const full = normalizeEan13(value);
  if (!full) throw new Error("EAN-13 체크 숫자가 맞지 않아요.");
  const parity = PARITY[Number(full[0])];
  let bits = "101";
  for (let i = 1; i <= 6; i++) {
    const n = Number(full[i]);
    bits += parity[i - 1] === "L" ? L[n] : G[n];
  }
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[Number(full[i])];
  return bits + "101";
}

function patternBits(pattern: string): string {
  let bar = true;
  let bits = "";
  for (const width of pattern) {
    bits += (bar ? "1" : "0").repeat(Number(width));
    bar = !bar;
  }
  return bits;
}

function code128Bits(value: string): string {
  if (!value || value.length > 24 || !/^[\x20-\x7E]+$/.test(value))
    throw new Error("Code 128은 영문·숫자·기호 24자까지 지원해요.");
  const values = [...value].map((char) => char.charCodeAt(0) - 32);
  let checksum = 104;
  values.forEach((code, index) => {
    checksum += code * (index + 1);
  });
  const symbols = [104, ...values, checksum % 103, 106];
  return symbols.map((code) => patternBits(CODE128[code])).join("");
}

export function barcodeModules(value: string): {
  kind: BarcodeKind;
  label: string;
  value: string;
  modules: string;
} {
  const ean = normalizeEan13(value);
  if (ean) {
    return {
      kind: "ean13",
      label: "EAN-13",
      value: ean,
      modules: ean13Bits(ean),
    };
  }
  return {
    kind: "code128",
    label: "CODE 128",
    value,
    modules: code128Bits(value),
  };
}

export function barcodeRuns(
  modules: string,
): { bar: boolean; width: number }[] {
  const padded = "0000000000" + modules + "0000000000";
  const result: { bar: boolean; width: number }[] = [];
  let current = padded[0];
  let width = 1;
  for (let i = 1; i < padded.length; i++) {
    if (padded[i] === current) {
      width++;
    } else {
      result.push({ bar: current === "1", width });
      current = padded[i];
      width = 1;
    }
  }
  result.push({ bar: current === "1", width });
  return result;
}
