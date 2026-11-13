import AsyncStorage from '@react-native-async-storage/async-storage';

/** Namespaced, JSON-safe wrapper around AsyncStorage. Never throws. */
const PREFIX = 'skorspor:';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      console.warn(`[storage] read failed for "${key}"`, error);
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[storage] write failed for "${key}"`, error);
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch (error) {
      console.warn(`[storage] remove failed for "${key}"`, error);
    }
  },
};
