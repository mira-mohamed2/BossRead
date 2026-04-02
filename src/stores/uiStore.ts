import { create } from 'zustand';
import { ThemeMode } from '../types';
import { DEFAULT_SETTINGS, FontKey, ThemeColors, THEMES } from '../constants';

interface UIState {
  theme: ThemeMode;
  colors: ThemeColors;
  fontFamily: FontKey;
  fontSize: number;
  lineHeight: number;
  isOnline: boolean;

  setTheme: (theme: ThemeMode) => void;
  setFontFamily: (font: FontKey) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setOnline: (online: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: DEFAULT_SETTINGS.theme,
  colors: THEMES[DEFAULT_SETTINGS.theme],
  fontFamily: DEFAULT_SETTINGS.fontFamily,
  fontSize: DEFAULT_SETTINGS.fontSize,
  lineHeight: DEFAULT_SETTINGS.lineHeight,
  isOnline: true,

  setTheme: (theme) => set({ theme, colors: THEMES[theme] }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setFontSize: (fontSize) => set({ fontSize: Math.max(12, Math.min(32, fontSize)) }),
  setLineHeight: (lineHeight) => set({ lineHeight: Math.max(1.0, Math.min(3.0, lineHeight)) }),
  setOnline: (isOnline) => set({ isOnline }),
}));
