import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY } from "./state";
export const documentStore = {
  read: () => AsyncStorage.getItem(STORAGE_KEY),
  write: (raw: string) => AsyncStorage.setItem(STORAGE_KEY, raw),
};
