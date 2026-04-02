import { ThemeMode } from './content';

export interface UserSettings {
  userId: string;
  theme: ThemeMode;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  defaultTtsVoice: string | null;
  defaultTtsSpeed: number;
  syncEnabled: boolean;
  updatedAt: string;
}
