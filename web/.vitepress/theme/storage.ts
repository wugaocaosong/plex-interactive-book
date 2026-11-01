export function readStore<T>(key: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem(localLearningKey(key)) || "null") ?? fallback
    );
  } catch {
    return fallback;
  }
}
export function saveStore(key: string, value: unknown) {
  try {
    localStorage.setItem(localLearningKey(key), JSON.stringify(value));
    void putLearning(key, value).catch(() => {});
  } catch (error) {
    storageError(error);
  }
}
import { putLearning, storageError } from "./learning-store";
import { localLearningKey } from './learning-scope';
