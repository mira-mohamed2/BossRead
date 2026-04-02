import { useState, useCallback } from 'react';
import { db } from '../../../services/powersync';
import { useAuthStore } from '../../../stores';

export interface ReadingStats {
  totalBooks: number;
  totalArticles: number;
  totalReadSeconds: number;
  completedItems: number;
  currentStreak: number;
  longestStreak: number;
  recentActivity: { date: string; seconds: number }[];
  topItems: { title: string; seconds: number }[];
}

const EMPTY: ReadingStats = {
  totalBooks: 0,
  totalArticles: 0,
  totalReadSeconds: 0,
  completedItems: 0,
  currentStreak: 0,
  longestStreak: 0,
  recentActivity: [],
  topItems: [],
};

export function useReadingStats() {
  const userId = useAuthStore((s) => s.userId);
  const [stats, setStats] = useState<ReadingStats>(EMPTY);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [counts] = await db.getAll<{
        totalBooks: number;
        totalArticles: number;
      }>(
        `SELECT
          SUM(CASE WHEN type = 'book' THEN 1 ELSE 0 END) as totalBooks,
          SUM(CASE WHEN type = 'article' THEN 1 ELSE 0 END) as totalArticles
        FROM content_items WHERE user_id = ? AND deleted_at IS NULL`,
        [userId],
      );

      const [completed] = await db.getAll<{ count: number }>(
        `SELECT COUNT(*) as count FROM reading_progress WHERE user_id = ? AND percentage >= 100`,
        [userId],
      );

      const progressRows = await db.getAll<{
        content_id: string;
        last_read_at: string;
        total_read_seconds: number;
      }>(
        `SELECT content_id, last_read_at, total_read_seconds FROM reading_progress WHERE user_id = ?`,
        [userId],
      );

      // Calculate streaks from unique reading days
      const readDays = new Map<string, number>();
      let totalReadSeconds = 0;
      for (const row of progressRows) {
        totalReadSeconds += row.total_read_seconds ?? 0;
        if (row.last_read_at) {
          const day = row.last_read_at.slice(0, 10);
          readDays.set(day, (readDays.get(day) ?? 0) + (row.total_read_seconds ?? 0));
        }
      }
      const sortedDays = [...readDays.keys()].sort().reverse();

      let currentStreak = 0;
      let longestStreak = 0;
      let streak = 0;
      const today = new Date();

      for (let i = 0; i < sortedDays.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        const expectedStr = expected.toISOString().slice(0, 10);
        if (sortedDays[i] === expectedStr) {
          streak++;
        } else {
          if (i === 0) {
            // check if yesterday
            expected.setDate(expected.getDate() - 1);
            const yesterdayStr = expected.toISOString().slice(0, 10);
            if (sortedDays[i] === yesterdayStr) {
              streak++;
            } else break;
          } else break;
        }
      }
      currentStreak = streak;
      // Compute longest streak
      streak = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
          streak++;
        } else {
          longestStreak = Math.max(longestStreak, streak);
          streak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, streak, currentStreak);

      // Recent 14 days activity (filled with zeros for missing days)
      const recentActivity: { date: string; seconds: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        recentActivity.push({ date: ds, seconds: readDays.get(ds) ?? 0 });
      }

      // Top 5 items
      const topRows = await db.getAll<{ title: string; total_read_seconds: number }>(
        `SELECT c.title, p.total_read_seconds
         FROM reading_progress p JOIN content_items c ON p.content_id = c.id
         WHERE p.user_id = ? ORDER BY p.total_read_seconds DESC LIMIT 5`,
        [userId],
      );
      const topItems = topRows.map((r) => ({
        title: r.title,
        seconds: r.total_read_seconds ?? 0,
      }));

      setStats({
        totalBooks: counts?.totalBooks ?? 0,
        totalArticles: counts?.totalArticles ?? 0,
        totalReadSeconds,
        completedItems: completed?.count ?? 0,
        currentStreak,
        longestStreak,
        recentActivity,
        topItems,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { stats, loading, loadStats };
}