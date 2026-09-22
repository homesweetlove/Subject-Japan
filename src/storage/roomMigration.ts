import { decodeState } from "./state";

export interface DocumentStore {
  read(): Promise<string | null>;
  write(raw: string): Promise<void>;
}
/** Validate before copying, persist before cleanup; never fall back after a Room error. */
export async function migrateToRoom(
  room: DocumentStore,
  legacy: DocumentStore & { remove(): Promise<void> },
): Promise<string | null> {
  const current = await room.read();
  if (current !== null) return current;
  const previous = await legacy.read();
  if (previous === null) return null;
  decodeState(previous);
  await room.write(previous);
  // A cleanup failure must not hide successfully migrated data. Room stays authoritative.
  await legacy.remove().catch(() => {});
  return previous;
}
