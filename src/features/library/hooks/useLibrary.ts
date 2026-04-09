import { useCallback, useMemo, useState } from 'react';
import { db } from '../../../services/powersync';
import { useAuthStore } from '../../../stores';
import { ContentWithDetails, BookDetails, ArticleDetails } from '../../../types';

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
      const bookRows = await db.getAll<
        {
          id: string;
          title: string;
          author: string | null;
          cover_uri: string | null;
          language: string;
          word_count: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          user_id: string;
          details_content_id: string;
          details_format: BookDetails['format'];
          details_file_path: string;
          details_file_hash: string;
          details_file_size: number;
          details_total_pages: number | null;
          details_publisher: string | null;
          details_isbn: string | null;
        }
      >(
        `SELECT
           c.id,
           c.title,
           c.author,
           c.cover_uri,
           c.language,
           c.word_count,
           c.created_at,
           c.updated_at,
           c.deleted_at,
           c.user_id,
           b.content_id AS details_content_id,
           b.format AS details_format,
           b.file_path AS details_file_path,
           b.file_hash AS details_file_hash,
           b.file_size AS details_file_size,
           b.total_pages AS details_total_pages,
           b.publisher AS details_publisher,
           b.isbn AS details_isbn
         FROM content_items c
         JOIN book_details b ON b.content_id = c.id
         WHERE c.user_id = ? AND c.deleted_at IS NULL AND c.type = 'book'`,
        [userId],
      );

      const articleRows = await db.getAll<
        {
          id: string;
          title: string;
          author: string | null;
          cover_uri: string | null;
          language: string;
          word_count: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          user_id: string;
          details_content_id: string;
          details_url: string;
          details_site_name: string | null;
          details_excerpt: string | null;
          details_html_content: string;
          details_estimated_read_minutes: number | null;
        }
      >(
        `SELECT
           c.id,
           c.title,
           c.author,
           c.cover_uri,
           c.language,
           c.word_count,
           c.created_at,
           c.updated_at,
           c.deleted_at,
           c.user_id,
           a.content_id AS details_content_id,
           a.url AS details_url,
           a.site_name AS details_site_name,
           a.excerpt AS details_excerpt,
           a.html_content AS details_html_content,
           a.estimated_read_minutes AS details_estimated_read_minutes
         FROM content_items c
         JOIN article_details a ON a.content_id = c.id
         WHERE c.user_id = ? AND c.deleted_at IS NULL AND c.type = 'article'`,
        [userId],
      );

      const books: ContentWithDetails[] = bookRows.map((row) => {
        const {
          details_content_id,
          details_format,
          details_file_path,
          details_file_hash,
          details_file_size,
          details_total_pages,
          details_publisher,
          details_isbn,
          ...item
        } = row;

        return {
          ...item,
          type: 'book',
          details: {
            content_id: details_content_id,
            format: details_format,
            file_path: details_file_path,
            file_hash: details_file_hash,
            file_size: details_file_size,
            total_pages: details_total_pages,
            publisher: details_publisher,
            isbn: details_isbn,
          },
        };
      });

      const articles: ContentWithDetails[] = articleRows.map((row) => {
        const {
          details_content_id,
          details_url,
          details_site_name,
          details_excerpt,
          details_html_content,
          details_estimated_read_minutes,
          ...item
        } = row;

        return {
          ...item,
          type: 'article',
          details: {
            content_id: details_content_id,
            url: details_url,
            site_name: details_site_name,
            excerpt: details_excerpt,
            html_content: details_html_content,
            estimated_read_minutes: details_estimated_read_minutes,
          },
        };
      });

      const results = [...books, ...articles].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

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
