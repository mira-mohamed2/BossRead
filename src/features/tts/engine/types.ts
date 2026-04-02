import { TTSChunk } from '../../../types';

/**
 * Abstract TTS engine interface.
 * Implemented by NativeTTSAdapter and CloudTTSAdapter.
 */
export interface ITTSEngine {
  speak(text: string, options: TTSSpeakOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  isSpeaking(): boolean;
}

export interface TTSSpeakOptions {
  language?: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}
