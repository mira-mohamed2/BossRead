import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { db } from '../../../services/powersync';
import { useAuthStore, useReaderStore } from '../../../stores';
import { useDebouncedCallback } from '../../../hooks';
import { ContentPosition } from '../../../types';
import { ulid } from 'ulid';

interface ProgressRow {
  id: string;
  content_id: string;
  position_data: string;
  percentage: number;
  total_read_seconds: number;
  last_read_at: string;
  user_id: string;
}

/**
 * Hook that manages reading progress for a given content item.
 *
 * - Restores saved position on mount
 * - Debounce-saves position changes to PowerSync (local + synced)
 * - Tracks active reading time
 * - Force-saves on unmount and app background
 */
export function useReadingProgress(contentId: string | undefined) {
  const userId = useAuthStore((s) => s.userId);
  const { position, setPosition } = useReaderStore();
  const readStartRef = useRef<number>(Date.now());
  const accumulatedSecondsRef = useRef(0);
  const latestPositionRef = useRef<ContentPosition>(position);
  const latestPercentageRef = useRef(0);
  const hasSavedRef = useRef(false);

  // Keep refs in sync
  latestPositionRef.current = position;

  // ---- restore on mount ----
  useEffect(() => {
    if (!contentId || !userId) return;
    let cancelled = false;

    (async () => {
      const rows = await db.getAll<ProgressRow>(
        `SELECT * FROM reading_progress WHERE content_id = ? AND user_id = ?`,
        [contentId, userId],
      );

      if (cancelled || rows.length === 0) return;

      const row = rows[0];
      accumulatedSecondsRef.current = row.total_read_seconds ?? 0;

      try {
        const savedPos: ContentPosition = JSON.parse(row.position_data ?? '{}');
        setPosition(savedPos);
      } catch {
        // corrupt JSON — start from beginning
      }
    })();

    readStartRef.current = Date.now();

    return () => {
      cancelled = true;
    };
  }, [contentId, userId, setPosition]);

  // ---- persist helper ----
  const persist = useCallback(async () => {
    if (!contentId || !userId) return;

    const sessionSeconds = Math.round((Date.now() - readStartRef.current) / 1000);
    const totalSeconds = accumulatedSecondsRef.current + sessionSeconds;
    const now = new Date().toISOString();
    const positionData = JSON.stringify(latestPositionRef.current);
    const percentage = latestPercentageRef.current;

    const existing = await db.getAll<{ id: string }>(
      `SELECT id FROM reading_progress WHERE content_id = ? AND user_id = ?`,
      [contentId, userId],
    );

    if (existing.length > 0) {
      await db.execute(
        `UPDATE reading_progress
         SET position_data = ?, percentage = ?, total_read_seconds = ?,
             last_read_at = ?, updated_at = ?
         WHERE id = ?`,
        [positionData, percentage, totalSeconds, now, now, existing[0].id],
      );
    } else {
      const id = ulid();
      await db.execute(
        `INSERT INTO reading_progress
         (id, content_id, position_data, percentage, total_read_seconds,
          last_read_at, updated_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, contentId, positionData, percentage, totalSeconds, now, now, userId],
      );
    }

    // Reset timer so subsequent saves don't double-count
    readStartRef.current = Date.now();
    accumulatedSecondsRef.current = totalSeconds;
    hasSavedRef.current = true;
  }, [contentId, userId]);

  // ---- debounced save on position changes ----
  const debouncedPersist = useDebouncedCallback(persist, 2000);

  const updatePosition = useCallback(
    (pos: ContentPosition, percentage?: number) => {
      setPosition(pos);
      if (percentage !== undefined) latestPercentageRef.current = percentage;
      debouncedPersist();
    },
    [setPosition, debouncedPersist],
  );

  // ---- save on unmount ----
  useEffect(() => {
    return () => {
      persist();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist]);

  // ---- save when app goes to background ----
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        persist();
      } else if (state === 'active') {
        // Reset timer when app comes back
        readStartRef.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, [persist]);

  return { position, updatePosition };
}
