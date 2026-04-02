import { useUIStore } from '../stores';
import { ThemeColors } from '../constants';

/**
 * Convenience hook to access current theme colors.
 */
export function useTheme(): ThemeColors {
  return useUIStore((s) => s.colors);
}
