import { documentStore } from "./documentStore";
import type { LocalState } from "../domain/models";
import { decodeState } from "./state";

/** Serial writes prevent slower earlier saves from overwriting newer changes. */
let pending: Promise<void> = Promise.resolve();
export const localRepository = {
  async load() {
    return decodeState(await documentStore.read());
  },
  save(state: LocalState) {
    const raw = JSON.stringify(state);
    const write = pending.catch(() => {}).then(() => documentStore.write(raw));
    pending = write;
    return write;
  },
};
