import { decodeState } from "./state";

export interface DocumentStore {
  read(): Promise<string | null>;
  write(raw: string): Promise<void>;
}

/** Keep the complete read/copy/cleanup sequence exclusive with normal writes. */
export function createMigratingDocumentStore(
  room: DocumentStore,
  legacy: DocumentStore & { remove(): Promise<void> },
): DocumentStore {
  let pending: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = pending.catch(() => {}).then(operation);
    pending = next;
    return next;
  };
  return {
    read: () => enqueue(() => migrateToRoom(room, legacy)),
    write: (raw) =>
      enqueue(async () => {
        await room.write(raw);
        // Also remove stale legacy data after restore/reset. Never delete the
        // legacy copy before the authoritative document is durably written.
        await legacy.remove().catch(() => {});
      }),
  };
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
