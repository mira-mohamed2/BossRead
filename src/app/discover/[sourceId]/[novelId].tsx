import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUIStore, useAuthStore } from '../../../stores';
import { getSourceById } from '../../../features/discover/sources';
import type { NovelInfo, ChapterInfo } from '../../../features/discover/sources';
import { db } from '../../../services/powersync';
import { generateId } from '../../../utils';

export default function NovelDetailScreen() {
  const { sourceId, novelId } = useLocalSearchParams<{ sourceId: string; novelId: string }>();
  const router = useRouter();
  const colors = useUIStore((s) => s.colors);
  const userId = useAuthStore((s) => s.userId);

  const [novel, setNovel] = useState<NovelInfo | null>(null);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [addedToLibrary, setAddedToLibrary] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const source = getSourceById(sourceId);

  useEffect(() => {
    if (!source || !novelId) return;
    loadNovel();
  }, [sourceId, novelId]);

  const loadNovel = async () => {
    if (!source) return;
    setLoading(true);
    try {
      const details = await source.getNovelDetails(novelId);
      setNovel(details);

      setChaptersLoading(true);
      const chapterList = await source.getChapterList(novelId);
      setChapters(chapterList);
    } catch (err) {
      console.error('Failed to load novel:', err);
    } finally {
      setLoading(false);
      setChaptersLoading(false);
    }
  };

  const handleAddToLibrary = useCallback(async () => {
    if (!novel || !userId) return;
    try {
      const id = generateId();
      const now = new Date().toISOString();

      await db.writeTransaction(async (tx) => {
        await tx.execute(
          `INSERT INTO content_items (id, type, title, author, cover_uri, language, word_count, created_at, updated_at, deleted_at, user_id)
           VALUES (?, 'article', ?, ?, ?, 'en', NULL, ?, ?, NULL, ?)`,
          [id, novel.title, novel.author, novel.coverUrl, now, now, userId],
        );
        await tx.execute(
          `INSERT INTO article_details (id, content_id, url, site_name, excerpt, html_content, estimated_read_minutes)
           VALUES (?, ?, ?, ?, ?, '', NULL)`,
          [generateId(), id, novel.url, source?.name ?? '', novel.description],
        );
      });

      setAddedToLibrary(true);
      Alert.alert('Added', `"${novel.title}" added to library`);
    } catch (err) {
      console.error('Add to library failed:', err);
      Alert.alert('Error', 'Failed to add to library');
    }
  }, [novel, userId]);

  const handleChapterPress = (chapter: ChapterInfo) => {
    router.push({
      pathname: '/discover/chapter',
      params: {
        sourceId,
        novelId,
        chapterId: chapter.id,
        novelTitle: novel?.title ?? '',
      },
    });
  };

  const sortedChapters = sortAsc ? chapters : [...chapters].reverse();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!novel || !source) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Novel not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {source.name}
        </Text>
      </View>

      <FlatList
        data={sortedChapters}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListHeaderComponent={
          <View>
            {/* Novel info */}
            <View style={styles.novelInfo}>
              {novel.coverUrl ? (
                <Image source={{ uri: novel.coverUrl }} style={styles.cover} resizeMode="cover" />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.infoRight}>
                <Text style={[styles.title, { color: colors.text }]}>{novel.title}</Text>
                {novel.author && <Text style={[styles.author, { color: colors.textSecondary }]}>{novel.author}</Text>}
                {novel.status !== 'unknown' && (
                  <View style={[styles.statusBadge, {
                    backgroundColor: novel.status === 'completed' ? '#22c55e20' : '#3b82f620',
                  }]}>
                    <Text style={[styles.statusText, {
                      color: novel.status === 'completed' ? '#22c55e' : '#3b82f6',
                    }]}>
                      {novel.status.charAt(0).toUpperCase() + novel.status.slice(1)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.chapterCount, { color: colors.textSecondary }]}>
                  {chapters.length} chapters
                </Text>
              </View>
            </View>

            {/* Genres */}
            {novel.genres.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreRow} contentContainerStyle={styles.genreContent}>
                {novel.genres.map((genre, i) => (
                  <View key={i} style={[styles.genreChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.genreText, { color: colors.textSecondary }]}>{genre}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Description */}
            {novel.description && (
              <Text style={[styles.description, { color: colors.text }]}>{novel.description}</Text>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: addedToLibrary ? 0.6 : 1 }]}
                onPress={handleAddToLibrary}
                disabled={addedToLibrary}
              >
                <Ionicons name={addedToLibrary ? 'checkmark' : 'add'} size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>{addedToLibrary ? 'In Library' : 'Add to Library'}</Text>
              </TouchableOpacity>
              {chapters.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
                  onPress={() => handleChapterPress(chapters[0])}
                >
                  <Ionicons name="play" size={20} color="#FFF" />
                  <Text style={styles.actionBtnText}>Start Reading</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Chapter header */}
            <View style={styles.chapterHeader}>
              <Text style={[styles.chapterHeaderText, { color: colors.text }]}>Chapters</Text>
              <TouchableOpacity onPress={() => setSortAsc((v) => !v)} style={styles.sortBtn}>
                <Ionicons name={sortAsc ? 'arrow-up' : 'arrow-down'} size={18} color={colors.textSecondary} />
                <Text style={[styles.sortText, { color: colors.textSecondary }]}>{sortAsc ? 'Oldest' : 'Newest'}</Text>
              </TouchableOpacity>
            </View>

            {chaptersLoading && <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} />}
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.chapterItem, { borderBottomColor: colors.border }]}
            onPress={() => handleChapterPress(item)}
          >
            <Text style={[styles.chapterNum, { color: colors.textSecondary }]}>
              {item.chapterNumber ?? index + 1}
            </Text>
            <Text style={[styles.chapterTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', flex: 1 },
  novelInfo: { flexDirection: 'row', padding: 16, gap: 16 },
  cover: { width: 120, height: 180, borderRadius: 8 },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  infoRight: { flex: 1, gap: 4 },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  author: { fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  chapterCount: { fontSize: 13, marginTop: 4 },
  genreRow: { maxHeight: 40 },
  genreContent: { paddingHorizontal: 16, gap: 8 },
  genreChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  genreText: { fontSize: 11 },
  description: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingVertical: 12 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chapterHeaderText: { fontSize: 16, fontWeight: '700' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 13 },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  chapterNum: { fontSize: 13, fontWeight: '500', width: 36 },
  chapterTitle: { fontSize: 14, flex: 1 },
  listContent: { paddingBottom: 40 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 100 },
});
