import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import { STORAGE_KEY } from "./state";
import {
  createMigratingDocumentStore,
  type DocumentStore,
} from "./roomMigration";

const room = requireOptionalNativeModule<DocumentStore>("SubjectLocalStore");
const legacy = {
  read: () => AsyncStorage.getItem(STORAGE_KEY),
  write: (raw: string) => AsyncStorage.setItem(STORAGE_KEY, raw),
  remove: () => AsyncStorage.removeItem(STORAGE_KEY),
};
// Expo Go lacks the local module; dedicated Android builds use Room.
export const documentStore: DocumentStore = room
  ? createMigratingDocumentStore(room, legacy)
  : legacy;
