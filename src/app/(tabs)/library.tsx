import { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useUIStore } from '../../stores';
import { useLibrary, useImport } from '../../features/library/hooks';
import { ContentCard, EmptyLibrary } from '../../features/library/components';
import { ContentWithDetails } from '../../types';

export default function LibraryScreen() {
  const router = useRouter();
  const colors = useUIStore((s) => s.colors);
  const {
    items,
    progressMap,
    loading,
    searchQuery,
    filterType,
    setSearchQuery,
    setFilterType,
    loadItems,
    deleteItem,
  } = useLibrary();
  const { importBook, importing } = useImport();

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  const handleImport = async () => {
    try {
      const id = await importBook();
      if (id) {
        loadItems();
      }
    } catch (err: any) {
      Alert.alert('Import Failed', err.message ?? 'Could not import file');
    }
  };

  const handlePress = (item: ContentWithDetails) => {
    router.push(`/reader/${item.id}`);
  };

  const handleLongPress = (item: ContentWithDetails) => {
    Alert.alert(item.title, 'Choose an action', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteItem(item.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filterActive = searchQuery.trim().length > 0 || filterType !== 'all';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search library..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['all', 'book', 'article', 'bookmarked'] as const).map((type) => {
          const active = filterType === type;
          const iconMap = { all: 'apps', book: 'book', article: 'document-text', bookmarked: 'bookmark' } as const;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilterType(type)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={iconMap[type] as any}
                size={14}
                color={active ? '#FFF' : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContentCard
            item={item}
            progress={progressMap[item.id]}
            onPress={() => handlePress(item)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<EmptyLibrary filterActive={filterActive} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadItems} tintColor={colors.primary} />
        }
      />

      {/* FAB - Import */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, opacity: importing ? 0.6 : 1 }]}
        onPress={handleImport}
        disabled={importing}
        accessibilityRole="button"
        accessibilityLabel="Import book"
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  list: { paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
