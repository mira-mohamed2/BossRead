import { ThemeMode } from '../types';
import { StyleSheet } from 'react-native';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
  card: string;
  error: string;
  readerBackground: string;
  readerText: string;
}

const lightColors: ThemeColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  primary: '#2563EB',
  border: '#E5E7EB',
  card: '#FFFFFF',
  error: '#DC2626',
  readerBackground: '#FFFFFF',
  readerText: '#1A1A1A',
};

const darkColors: ThemeColors = {
  background: '#111111',
  surface: '#1E1E1E',
  text: '#E5E5E5',
  textSecondary: '#9CA3AF',
  primary: '#60A5FA',
  border: '#374151',
  card: '#1E1E1E',
  error: '#EF4444',
  readerBackground: '#1A1A1A',
  readerText: '#D4D4D4',
};

const sepiaColors: ThemeColors = {
  background: '#F4ECD8',
  surface: '#FAF3E3',
  text: '#5B4636',
  textSecondary: '#8B7355',
  primary: '#B8860B',
  border: '#D4C5A9',
  card: '#FAF3E3',
  error: '#C53030',
  readerBackground: '#F4ECD8',
  readerText: '#5B4636',
};

const amoledColors: ThemeColors = {
  background: '#000000',
  surface: '#0A0A0A',
  text: '#E5E5E5',
  textSecondary: '#9CA3AF',
  primary: '#60A5FA',
  border: '#1F2937',
  card: '#0A0A0A',
  error: '#EF4444',
  readerBackground: '#000000',
  readerText: '#C4C4C4',
};

export const THEMES: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
  sepia: sepiaColors,
  amoled: amoledColors,
};

export const FONTS = {
  system: undefined, // system default
  serif: 'serif',
  sans: 'sans-serif',
  openDyslexic: 'OpenDyslexic',
} as const;

export type FontKey = keyof typeof FONTS;

export const DEFAULT_SETTINGS = {
  theme: 'light' as ThemeMode,
  fontFamily: 'system' as FontKey,
  fontSize: 18,
  lineHeight: 1.6,
  defaultTtsSpeed: 1.0,
};
