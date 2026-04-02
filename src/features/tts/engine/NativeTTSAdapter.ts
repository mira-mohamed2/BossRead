import * as Speech from 'expo-speech';
import { ITTSEngine, TTSSpeakOptions } from './types';

/**
 * Native TTS adapter using expo-speech (system voices).
 * Works offline, zero cost, available on all devices.
 */
export class NativeTTSAdapter implements ITTSEngine {
  private speaking = false;

  async speak(text: string, options: TTSSpeakOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.speaking = true;
      Speech.speak(text, {
        language: options.language ?? 'en',
        rate: options.rate ?? 1.0,
        pitch: options.pitch ?? 1.0,
        voice: options.voiceId ?? undefined,
        onStart: () => {
          options.onStart?.();
        },
        onDone: () => {
          this.speaking = false;
          options.onDone?.();
          resolve();
        },
        onError: (error) => {
          this.speaking = false;
          const err = new Error(String(error));
          options.onError?.(err);
          reject(err);
        },
      });
    });
  }

  stop(): void {
    Speech.stop();
    this.speaking = false;
  }

  pause(): void {
    Speech.pause();
  }

  resume(): void {
    Speech.resume();
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}

/**
 * Get available system TTS voices.
 */
export async function getAvailableVoices() {
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.map((v) => ({
    id: v.identifier,
    name: v.name,
    language: v.language,
    isPremium: false,
  }));
}
