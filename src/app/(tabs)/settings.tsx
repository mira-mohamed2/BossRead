import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../stores';
import { useAuthStore } from '../../stores';
import { FONTS, FontKey } from '../../constants';
import { ThemeMode } from '../../types';
import { signOut } from '../../services/supabase';

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: string }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'sepia', label: 'Sepia', icon: 'cafe-outline' },
  { key: 'amoled', label: 'AMOLED', icon: 'contrast-outline' },
];

const FONT_OPTIONS: { key: FontKey; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'sans', label: 'Sans' },
  { key: 'serif', label: 'Serif' },
  { key: 'openDyslexic', label: 'OpenDyslexic' },
];

export default function SettingsScreen() {
  const colors = useUIStore((s) => s.colors);
  const theme = useUIStore((s) => s.theme);
  const fontFamily = useUIStore((s) => s.fontFamily);
  const fontSize = useUIStore((s) => s.fontSize);
  const lineHeight = useUIStore((s) => s.lineHeight);
  const setTheme = useUIStore((s) => s.setTheme);
  const setFontFamily = useUIStore((s) => s.setFontFamily);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const setLineHeight = useUIStore((s) => s.setLineHeight);

  const clearUser = useAuthStore((s) => s.clearUser);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            console.error('Sign out error:', err);
            clearUser();
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Theme */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chipRow}>
          {THEME_OPTIONS.map((t) => {
            const active = theme === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.background,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTheme(t.key)}
              >
                <Ionicons name={t.icon as any} size={16} color={active ? '#FFF' : colors.text} />
                <Text style={[styles.chipText, { color: active ? '#FFF' : colors.text }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Font Size */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Font Size</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sliderRow}>
          <TouchableOpacity onPress={() => setFontSize(fontSize - 1)} style={styles.stepBtn}>
            <Ionicons name="remove" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.sliderValue, { color: colors.text }]}>{fontSize}px</Text>
          <TouchableOpacity onPress={() => setFontSize(fontSize + 1)} style={styles.stepBtn}>
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Line Height */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Height</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sliderRow}>
          <TouchableOpacity onPress={() => setLineHeight(+(lineHeight - 0.1).toFixed(1))} style={styles.stepBtn}>
            <Ionicons name="remove" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.sliderValue, { color: colors.text }]}>{lineHeight.toFixed(1)}</Text>
          <TouchableOpacity onPress={() => setLineHeight(+(lineHeight + 0.1).toFixed(1))} style={styles.stepBtn}>
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Font Family */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Font Family</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chipRow}>
          {FONT_OPTIONS.map((f) => {
            const active = fontFamily === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.background,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFontFamily(f.key)}
              >
                <Text style={[styles.chipText, { color: active ? '#FFF' : colors.text }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Account */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={[styles.menuText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipText: { fontSize: 14 },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepBtn: { padding: 8 },
  sliderValue: { fontSize: 18, fontWeight: '600', minWidth: 50, textAlign: 'center' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  menuText: { fontSize: 16 },
});