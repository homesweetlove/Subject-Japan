export interface MembershipCard {
  id: string;
  name: string;
  barcodeValue: string;
  link: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export const MEMBERSHIP_LIMIT = 40;

export function normalizeMembershipLink(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("바로가기 주소를 https://부터 입력해 주세요.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("안전한 https 주소만 등록할 수 있어요.");
  }
  return url.toString();
}

export function normalizeBarcodeValue(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (value.length > 24)
    throw new Error("바코드 번호는 24자까지 등록할 수 있어요.");
  if (!/^[\x20-\x7E]+$/.test(value))
    throw new Error("바코드는 영문·숫자·기호만 사용할 수 있어요.");
  return value;
}

export function makeMembershipCard(input: {
  id?: string;
  name: string;
  barcodeValue?: string;
  link?: string;
  note?: string;
  now?: number;
}): MembershipCard {
  const name = input.name.trim();
  if (!name) throw new Error("멤버십 이름을 입력해 주세요.");
  if (name.length > 40)
    throw new Error("멤버십 이름은 40자까지 입력할 수 있어요.");
  const barcodeValue = normalizeBarcodeValue(input.barcodeValue ?? "");
  const link = normalizeMembershipLink(input.link ?? "");
  const note = (input.note ?? "").trim();
  if (note.length > 100) throw new Error("메모는 100자까지 입력할 수 있어요.");
  if (!barcodeValue && !link)
    throw new Error("바코드 번호나 바로가기 링크 중 하나는 등록해 주세요.");
  const now = input.now ?? Date.now();
  return {
    id:
      input.id ??
      `membership-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    barcodeValue,
    link,
    note,
    createdAt: now,
    updatedAt: now,
  };
}

export function validMembershipCard(value: unknown): value is MembershipCard {
  if (!value || typeof value !== "object") return false;
  const card = value as MembershipCard;
  try {
    return (
      /^membership-[a-z0-9-]{3,80}$/i.test(card.id) &&
      typeof card.name === "string" &&
      card.name.trim().length > 0 &&
      card.name.length <= 40 &&
      typeof card.barcodeValue === "string" &&
      normalizeBarcodeValue(card.barcodeValue) === card.barcodeValue.trim() &&
      typeof card.link === "string" &&
      normalizeMembershipLink(card.link) === card.link &&
      typeof card.note === "string" &&
      card.note.length <= 100 &&
      (!!card.barcodeValue || !!card.link) &&
      Number.isFinite(card.createdAt) &&
      Number.isFinite(card.updatedAt)
    );
  } catch {
    return false;
  }
}
