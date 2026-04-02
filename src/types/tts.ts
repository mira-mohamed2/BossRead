import { ContentPosition } from './position';

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading';

export interface TTSPreferences {
  contentId: string;
  voiceId: string | null;
  speed: number;
  pitch: number;
  lastPosition: ContentPosition | null;
  updatedAt: string;
  userId: string;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  isPremium: boolean;
}

export interface TTSChunk {
  text: string;
  paragraphIndex: number;
  sentenceIndex: number;
  charOffset: number;
}
