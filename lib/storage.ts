import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWebSSR = Platform.OS === 'web' && !globalThis.window?.localStorage;
const memoryStore = new Map<string, string>();

/**
 * Unified Storage Utility for ServEase
 * Uses SecureStore for native platforms and memory fallback for SSR/Restricted environments.
 * Note: SecureStore has a 2048-byte limit per key.
 */
const CHUNK_SIZE = 2000;

export const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWebSSR) return null;
    try {
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;

      // Check if it's a chunked metadata object
      if (value.startsWith('__chunked__:')) {
        const { count } = JSON.parse(value.replace('__chunked__:', ''));
        const chunks = await Promise.all(
          Array.from({ length: count }).map((_, i) =>
            SecureStore.getItemAsync(`${key}_chunk_${i}`),
          ),
        );
        return chunks.join('');
      }

      return value;
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isWebSSR) return;
    try {
      if (value.length > CHUNK_SIZE) {
        const count = Math.ceil(value.length / CHUNK_SIZE);
        // Store metadata
        await SecureStore.setItemAsync(
          key,
          `__chunked__:${JSON.stringify({ count })}`,
        );
        // Store chunks
        for (let i = 0; i < count; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      memoryStore.set(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (isWebSSR) return;
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value?.startsWith('__chunked__')) {
        const { count } = JSON.parse(value.replace('__chunked__:', ''));
        await Promise.all(
          Array.from({ length: count }).map((_, i) =>
            SecureStore.deleteItemAsync(`${key}_chunk_${i}`),
          ),
        );
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      memoryStore.delete(key);
    }
  },

  /**
   * Helper for non-string data (JSON)
   */
  getJson: async <T>(key: string): Promise<T | null> => {
    const data = await Storage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  setJson: async (key: string, value: any): Promise<void> => {
    await Storage.setItem(key, JSON.stringify(value));
  },
};
