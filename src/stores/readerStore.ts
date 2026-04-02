import { create } from 'zustand';
import { ContentPosition } from '../types';

interface ReaderState {
  /** ID of the content currently being read */
  contentId: string | null;
  /** Current reading position */
  position: ContentPosition;
  /** Whether reader controls (toolbar etc.) are visible */
  controlsVisible: boolean;
  /** Whether reader is in fullscreen / immersive mode */
  isFullscreen: boolean;

  setContentId: (id: string | null) => void;
  setPosition: (pos: ContentPosition) => void;
  toggleControls: () => void;
  setControlsVisible: (visible: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  reset: () => void;
}

const initialState = {
  contentId: null,
  position: {},
  controlsVisible: true,
  isFullscreen: false,
};

export const useReaderStore = create<ReaderState>((set) => ({
  ...initialState,

  setContentId: (contentId) => set({ contentId }),
  setPosition: (position) => set({ position }),
  toggleControls: () => set((s) => ({ controlsVisible: !s.controlsVisible })),
  setControlsVisible: (controlsVisible) => set({ controlsVisible }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  reset: () => set(initialState),
}));
