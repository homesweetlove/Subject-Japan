import { documentStore } from "./documentStore";
import type { LocalState } from "../domain/models";
import { decodeState } from "./state";
import type { DocumentStore } from "./roomMigration";

/** Reads share the write queue: a load may migrate data and therefore write. */
export function createLocalRepository(store: DocumentStore) {
  let pending: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = pending.catch(() => {}).then(operation);
    pending = next;
    return next;
  };
  return {
    load() {
      return enqueue(async () => decodeState(await store.read()));
    },
    save(state: LocalState) {
      // Snapshot now, before waiting on I/O; callers may reuse mutable objects.
      const raw = JSON.stringify(state);
      return enqueue(() => store.write(raw));
    },
  };
}

export const localRepository = createLocalRepository(documentStore);
