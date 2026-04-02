import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../../stores';
import { useBookmarks } from '../../../hooks';

interface ReaderToolbarProps {
  title: string;
  onBack: () => void;
  contentId: string;
}

export function ReaderToolbar({ title, onBack, contentId }: ReaderToolbarProps) {
  const colors = useUIStore((s) => s.colors);
  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const { isBookmarked, toggleBookmark, loadBookmarks } = useBookmarks();
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    loadBookmarks().then(() => {
      setBookmarked(isBookmarked(contentId));
    });
  }, [contentId, loadBookmarks, isBookmarked]);

  const handleToggleBookmark = async () => {
    await toggleBookmark(contentId);
    setBookmarked(!bookmarked);
  };

  return (
    <>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={handleToggleBookmark} style={styles.iconBtn} accessibilityLabel="Toggle bookmark">
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setFontSize(Math.max(12, fontSize - 2))}
          style={styles.iconBtn}
          accessibilityLabel="Decrease font size"
        >
          <Ionicons name="remove-circle-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.fontSizeLabel, { color: colors.textSecondary }]}>{fontSize}px</Text>
        <TouchableOpacity
          onPress={() => setFontSize(Math.min(32, fontSize + 2))}
          style={styles.iconBtn}
          accessibilityLabel="Increase font size"
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  iconBtn: {
    padding: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 12,
  },
  fontSizeLabel: {
    fontSize: 14,
    minWidth: 36,
    textAlign: 'center',
  },
});