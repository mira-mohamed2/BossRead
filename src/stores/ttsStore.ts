import { create } from 'zustand';
import { ContentPosition, TTSStatus, TTSChunk } from '../types';

interface TTSState {
  status: TTSStatus;
  /** Currently speaking content ID */
  contentId: string | null;
  /** Current voice ID (null = system default) */
  voiceId: string | null;
  speed: number;
  pitch: number;
  /** Current sentence being spoken */
  currentChunkIndex: number;
  /** All chunks for current content */
  chunks: TTSChunk[];
  /** Position in the content */
  currentPosition: ContentPosition;

  setStatus: (status: TTSStatus) => void;
  setContentId: (id: string | null) => void;
  setVoiceId: (id: string | null) => void;
  setSpeed: (speed: number) => void;
  setPitch: (pitch: number) => void;
  setCurrentChunkIndex: (index: number) => void;
  setChunks: (chunks: TTSChunk[]) => void;
  setCurrentPosition: (pos: ContentPosition) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as TTSStatus,
  contentId: null,
  voiceId: null,
  speed: 1.0,
  pitch: 1.0,
  currentChunkIndex: 0,
  chunks: [] as TTSChunk[],
  currentPosition: {},
};

export const useTTSStore = create<TTSState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setContentId: (contentId) => set({ contentId }),
  setVoiceId: (voiceId) => set({ voiceId }),
  setSpeed: (speed) => set({ speed: Math.max(0.25, Math.min(4.0, speed)) }),
  setPitch: (pitch) => set({ pitch: Math.max(0.5, Math.min(2.0, pitch)) }),
  setCurrentChunkIndex: (currentChunkIndex) => set({ currentChunkIndex }),
  setChunks: (chunks) => set({ chunks }),
  setCurrentPosition: (currentPosition) => set({ currentPosition }),
  reset: () => set(initialState),
}));
