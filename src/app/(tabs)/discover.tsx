import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../stores';
import { useDiscoverStore } from '../../features/discover/store';
import { getAllSources, getSourceById } from '../../features/discover/sources';
import type { NovelInfo } from '../../features/discover/sources';

export default function DiscoverScreen() {
  const router = useRouter();
  const colors = useUIStore((s) => s.colors);
  const {
    activeSourceId, searchQuery, tab, novels, loading, page, hasNextPage,
    setActiveSource, setSearchQuery, setTab, setNovels, appendNovels,
    setLoading, setPage, setHasNextPage,
  } = useDiscoverStore();

  const sources = getAllSources();
  const activeSource = getSourceById(activeSourceId);
  const [inputQuery, setInputQuery] = useState(searchQuery);

  const fetchNovels = useCallback(async (pageNum: number, append = false) => {
    if (!activeSource) return;
    setLoading(true);
    try {
      let result;
      if (tab === 'search' && searchQuery.trim()) {
        result = await activeSource.search(searchQuery.trim(), pageNum);
      } else if (tab === 'latest') {
        result = await activeSource.getLatest(pageNum);
      } else {
        result = await activeSource.getPopular(pageNum);
      }

      if (append) {
        appendNovels(result.items);
      } else {
        setNovels(result.items);
      }
      setHasNextPage(result.hasNextPage);
      setPage(pageNum);
    } catch (err) {
      console.error('Discover fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSource, tab, searchQuery]);

  useEffect(() => {
    fetchNovels(1);
  }, [activeSourceId, tab, searchQuery]);

  const handleSearch = () => {
    setSearchQuery(inputQuery);
    setTab('search');
  };

  const handleLoadMore = () => {
    if (!loading && hasNextPage) {
      fetchNovels(page + 1, true);
    }
  };

  const handleNovelPress = (novel: NovelInfo) => {
    router.push({
      pathname: '/discover/[sourceId]/[novelId]',
      params: { sourceId: novel.sourceId, novelId: novel.id },
    });
  };

  const renderNovelCard = ({ item }: { item: NovelInfo }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleNovelPress(item)}
      activeOpacity={0.7}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.surface }]}>
          <Ionicons name="book-outline" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.author && (
          <Text style={[styles.cardAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.author}
          </Text>
        )}
        {item.status !== 'unknown' && (
          <View style={[styles.statusBadge, {
            backgroundColor: item.status === 'completed' ? '#22c55e20' : item.status === 'ongoing' ? '#3b82f620' : '#f59e0b20',
          }]}>
            <Text style={[styles.statusText, {
              color: item.status === 'completed' ? '#22c55e' : item.status === 'ongoing' ? '#3b82f6' : '#f59e0b',
            }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search novels..."
            placeholderTextColor={colors.textSecondary}
            value={inputQuery}
            onChangeText={setInputQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {inputQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setInputQuery(''); if (tab === 'search') setTab('popular'); }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Source selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceRow} contentContainerStyle={styles.sourceRowContent}>
        {sources.map((source) => {
          const active = source.id === activeSourceId;
          return (
            <TouchableOpacity
              key={source.id}
              style={[
                styles.sourceChip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveSource(source.id)}
            >
              <Text style={[styles.sourceChipText, { color: active ? '#FFF' : colors.text }]}>
                {source.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab selector: Popular / Latest */}
      <View style={styles.tabRow}>
        {(['popular', 'latest'] as const).map((t) => {
          const active = tab === t || (tab === 'search' && t === 'popular');
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textSecondary }]}>
                {t === 'popular' ? 'Popular' : 'Latest'}
              </Text>
            </TouchableOpacity>
          );
        })}
        {tab === 'search' && (
          <View style={[styles.tabBtn, { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabText, { color: colors.primary }]}>
              Search: "{searchQuery}"
            </Text>
          </View>
        )}
      </View>

      {/* Novel list */}
      <FlatList
        data={novels}
        keyExtractor={(item, index) => `${item.sourceId}-${item.id}-${index}`}
        renderItem={renderNovelCard}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="compass-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {tab === 'search' ? 'No results found' : 'Browse novels from sources'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && novels.length > 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { paddingHorizontal: 16, paddingTop: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  sourceRow: { },
  sourceRowContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  sourceChipText: { fontSize: 13, fontWeight: '500' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 16, marginBottom: 4 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  tabText: { fontSize: 15, fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  columnWrapper: { gap: 8, marginBottom: 12 },
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: '48%',
  },
  cover: { width: '100%', aspectRatio: 0.67, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  cardAuthor: { fontSize: 12, marginTop: 3 },
  statusBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
