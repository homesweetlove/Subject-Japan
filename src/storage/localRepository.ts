import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalState } from "../domain/models";
import { decodeState, STORAGE_KEY } from "./state";

/** Serial writes prevent slower earlier saves from overwriting newer changes. */
let pending: Promise<void> = Promise.resolve();
export const localRepository = {
  async load() {
    return decodeState(await AsyncStorage.getItem(STORAGE_KEY));
  },
  save(state: LocalState) {
    const raw = JSON.stringify(state);
    const write = pending
      .catch(() => {})
      .then(() => AsyncStorage.setItem(STORAGE_KEY, raw));
    pending = write;
    return write;
  },
};
