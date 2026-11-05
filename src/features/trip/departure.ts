import type { AirportId } from "../pay/airportTaxFree";
import { taxFreeAirports } from "../pay/airportTaxFree";
import { parseJapanDateTime } from "./countdown";

/**
 * The flight home, entered once. The tax-free airport planner, the Today
 * card and the departure reminders all read it. Japan time throughout.
 */
export interface Departure {
  date: string;
  time: string;
  airportId: AirportId;
}

export function validDeparture(value: unknown): value is Departure {
  if (!value || typeof value !== "object") return false;
  const d = value as Departure;
  if (
    typeof d.date !== "string" ||
    typeof d.time !== "string" ||
    !taxFreeAirports.some((a) => a.id === d.airportId)
  )
    return false;
  try {
    parseJapanDateTime(d.date, d.time);
    return true;
  } catch {
    return false;
  }
}

export function departureTime(d: Departure): number {
  return parseJapanDateTime(d.date, d.time);
}

export function departureAirportName(d: Departure): string {
  return taxFreeAirports.find((a) => a.id === d.airportId)?.name ?? "공항";
}
