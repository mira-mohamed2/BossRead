import { useState, useCallback } from 'react';
import { db } from '../services/powersync';
import { useAuthStore } from '../stores';
import { ulid } from 'ulid';

export function useBookmarks() {
  const userId = useAuthStore((s) => s.userId);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const loadBookmarks = useCallback(async () => {
    if (!userId) return;
    const rows = await db.getAll<{ content_id: string }>(
      `SELECT DISTINCT content_id FROM annotations WHERE user_id = ? AND type = 'bookmark' AND deleted_at IS NULL`,
      [userId],
    );
    setBookmarkedIds(new Set(rows.map((r) => r.content_id)));
  }, [userId]);

  const isBookmarked = useCallback(
    (contentId: string) => bookmarkedIds.has(contentId),
    [bookmarkedIds],
  );

  const toggleBookmark = useCallback(
    async (contentId: string) => {
      if (!userId) return;
      const now = new Date().toISOString();
      if (bookmarkedIds.has(contentId)) {
        await db.execute(
          `UPDATE annotations SET deleted_at = ? WHERE user_id = ? AND content_id = ? AND type = 'bookmark'`,
          [now, userId, contentId],
        );
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(contentId);
          return next;
        });
      } else {
        const id = ulid();
        await db.execute(
          `INSERT INTO annotations (id, user_id, content_id, type, created_at, updated_at) VALUES (?, ?, ?, 'bookmark', ?, ?)`,
          [id, userId, contentId, now, now],
        );
        setBookmarkedIds((prev) => new Set(prev).add(contentId));
      }
    },
    [userId, bookmarkedIds],
  );

  const getBookmarkedIds = useCallback(() => bookmarkedIds, [bookmarkedIds]);

  return { isBookmarked, toggleBookmark, loadBookmarks, getBookmarkedIds };
}