export interface TripItem {
  id: string;
  title: string;
  when: string;
  place: string;
  reservation: string;
  note: string;
  done: boolean;
}
export function validTripItem(v: unknown): v is TripItem {
  const t = v as TripItem;
  if (
    !t ||
    typeof t.id !== "string" ||
    !/^[-a-zA-Z0-9]{1,80}$/.test(t.id) ||
    typeof t.title !== "string" ||
    !t.title.trim() ||
    t.title.length > 80 ||
    typeof t.when !== "string" ||
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t.when)
  )
    return false;
  const date = new Date(t.when.replace(" ", "T") + ":00+09:00");
  if (
    !Number.isFinite(date.getTime()) ||
    new Date(date.getTime() + 9 * 3600000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ") !== t.when
  )
    return false;
  return (
    typeof t.place === "string" &&
    t.place.length <= 100 &&
    typeof t.reservation === "string" &&
    t.reservation.length <= 100 &&
    typeof t.note === "string" &&
    t.note.length <= 2000 &&
    typeof t.done === "boolean"
  );
}
