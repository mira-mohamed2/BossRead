import { useCallback, useMemo, useState } from 'react';
import { db } from '../../../services/powersync';
import { useAuthStore } from '../../../stores';
import { ContentItem, ContentWithDetails, BookDetails, ArticleDetails } from '../../../types';

type SortKey = 'title' | 'created_at' | 'updated_at';
type FilterType = 'all' | 'book' | 'article' | 'bookmarked';

export function useLibrary() {
  const userId = useAuthStore((s) => s.userId);
  const [items, setItems] = useState<ContentWithDetails[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('updated_at');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const contentRows = await db.getAll<ContentItem & { id: string }>(
        `SELECT * FROM content_items WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
        [userId],
      );

      const results: ContentWithDetails[] = [];

      for (const item of contentRows) {
        if (item.type === 'book') {
          const [details] = await db.getAll<BookDetails>(
            `SELECT * FROM book_details WHERE content_id = ?`,
            [item.id],
          );
          if (details) {
            results.push({ ...item, type: 'book' as const, details });
          }
        } else if (item.type === 'article') {
          const [details] = await db.getAll<ArticleDetails>(
            `SELECT * FROM article_details WHERE content_id = ?`,
            [item.id],
          );
          if (details) {
            results.push({ ...item, type: 'article' as const, details });
          }
        }
      }

      setItems(results);

      // Load reading progress
      const progressRows = await db.getAll<{ content_id: string; percentage: number }>(
        `SELECT content_id, percentage FROM reading_progress WHERE user_id = ?`,
        [userId],
      );
      const pMap: Record<string, number> = {};
      for (const row of progressRows) {
        pMap[row.content_id] = row.percentage / 100;
      }
      setProgressMap(pMap);

      // Load bookmarks
      const bmRows = await db.getAll<{ content_id: string }>(
        `SELECT DISTINCT content_id FROM annotations WHERE user_id = ? AND type = 'bookmark' AND deleted_at IS NULL`,
        [userId],
      );
      setBookmarkedIds(new Set(bmRows.map((r) => r.content_id)));
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (filterType === 'bookmarked') {
      result = result.filter((item) => bookmarkedIds.has(item.id));
    } else if (filterType !== 'all') {
      result = result.filter((item) => item.type === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.author?.toLowerCase().includes(query),
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created_at':
          return b.created_at.localeCompare(a.created_at);
        case 'updated_at':
        default:
          return b.updated_at.localeCompare(a.updated_at);
      }
    });

    return result;
  }, [items, filterType, searchQuery, sortBy, bookmarkedIds]);

  const deleteItem = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      await db.execute(
        `UPDATE content_items SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, id],
      );
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [],
  );

  return {
    items: filteredItems,
    progressMap,
    loading,
    sortBy,
    filterType,
    searchQuery,
    setSortBy,
    setFilterType,
    setSearchQuery,
    loadItems,
    deleteItem,
  };
}
