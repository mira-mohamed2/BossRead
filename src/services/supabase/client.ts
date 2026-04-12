import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../../constants/env';

const CHUNK_SIZE = 2000;

/**
 * SecureStore adapter that chunks large values (e.g. Supabase JWTs)
 * into multiple ≤2000-byte entries to stay under the 2048-byte limit.
 */
const ExpoSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const raw = await SecureStore.getItemAsync(key);
    if (raw !== null) return raw;

    // Try reading chunked value
    const chunks: string[] = [];
    let i = 0;
    while (true) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (chunk === null) break;
      chunks.push(chunk);
      i++;
    }
    return chunks.length > 0 ? chunks.join('') : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      // Clean up any old chunks
      await ExpoSecureStoreAdapter._removeChunks(key);
      return;
    }

    // Remove the non-chunked key if it exists
    await SecureStore.deleteItemAsync(key).catch(() => {});

    // Store in chunks
    const totalChunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const chunk = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
    }
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key).catch(() => {});
    await ExpoSecureStoreAdapter._removeChunks(key);
  },

  async _removeChunks(key: string): Promise<void> {
    let i = 0;
    while (true) {
      const chunkKey = `${key}_chunk_${i}`;
      const exists = await SecureStore.getItemAsync(chunkKey);
      if (exists === null) break;
      await SecureStore.deleteItemAsync(chunkKey);
      i++;
    }
  },
};

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
