import { useCallback, useRef } from 'react';
import { useTTSStore } from '../../../stores';
import { NativeTTSAdapter } from '../engine/NativeTTSAdapter';
import { ITTSEngine } from '../engine/types';
import { chunkText, htmlToPlainText } from '../utils';
import { db } from '../../../services/powersync';

/**
 * Hook that controls TTS playback for any content item.
 */
export function useTTS() {
  const store = useTTSStore();
  const engineRef = useRef<ITTSEngine>(new NativeTTSAdapter());

  const play = useCallback(
    async (contentId: string) => {
      const engine = engineRef.current;

      // If already playing this content, resume
      if (store.contentId === contentId && store.status === 'paused') {
        engine.resume();
        store.setStatus('playing');
        return;
      }

      // Load content text
      store.setStatus('loading');
      store.setContentId(contentId);

      try {
        // Try article HTML first
        const [article] = await db.getAll<{ html_content: string }>(
          `SELECT html_content FROM article_details WHERE content_id = ?`,
          [contentId],
        );

        let text: string;
        if (article?.html_content) {
          text = htmlToPlainText(article.html_content);
        } else {
          // For books, we'd extract text from the file — placeholder for now
          text = 'Text extraction from books is not yet implemented.';
        }

        const chunks = chunkText(text);
        store.setChunks(chunks);

        // Start speaking from current chunk index
        await speakFromIndex(chunks, store.currentChunkIndex, engine);
      } catch (err) {
        console.error('TTS error:', err);
        store.setStatus('idle');
      }
    },
    [store],
  );

  const speakFromIndex = async (
    chunks: ReturnType<typeof chunkText>,
    startIndex: number,
    engine: ITTSEngine,
  ) => {
    for (let i = startIndex; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Check if stopped
      if (useTTSStore.getState().status === 'idle') break;

      useTTSStore.getState().setCurrentChunkIndex(i);
      useTTSStore.getState().setCurrentPosition({
        paragraphIndex: chunk.paragraphIndex,
        sentenceIndex: chunk.sentenceIndex,
        charOffset: chunk.charOffset,
      });
      useTTSStore.getState().setStatus('playing');

      await engine.speak(chunk.text, {
        rate: useTTSStore.getState().speed,
        pitch: useTTSStore.getState().pitch,
        voiceId: useTTSStore.getState().voiceId ?? undefined,
      });
    }

    // Done speaking all chunks
    useTTSStore.getState().setStatus('idle');
  };

  const pause = useCallback(() => {
    engineRef.current.pause();
    store.setStatus('paused');
  }, [store]);

  const stop = useCallback(() => {
    engineRef.current.stop();
    store.setStatus('idle');
    store.setCurrentChunkIndex(0);
  }, [store]);

  const skipForward = useCallback(() => {
    const nextIndex = Math.min(
      store.currentChunkIndex + 1,
      store.chunks.length - 1,
    );
    engineRef.current.stop();
    store.setCurrentChunkIndex(nextIndex);
    if (store.contentId) {
      play(store.contentId);
    }
  }, [store, play]);

  const skipBackward = useCallback(() => {
    const prevIndex = Math.max(store.currentChunkIndex - 1, 0);
    engineRef.current.stop();
    store.setCurrentChunkIndex(prevIndex);
    if (store.contentId) {
      play(store.contentId);
    }
  }, [store, play]);

  return {
    status: store.status,
    play,
    pause,
    stop,
    skipForward,
    skipBackward,
  };
}
