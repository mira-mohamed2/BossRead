/**
 * Environment configuration.
 * In production, these come from environment variables / EAS secrets.
 */
export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  POWERSYNC_URL: process.env.EXPO_PUBLIC_POWERSYNC_URL ?? '',
} as const;
