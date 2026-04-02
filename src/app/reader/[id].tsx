import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useReaderStore, useUIStore } from '../../stores';
import { db } from '../../services/powersync';
import { ContentWithDetails, BookDetails, ArticleDetails } from '../../types';
import { ReaderToolbar } from '../../features/reader/components/ReaderToolbar';
import { EpubRenderer } from '../../features/reader/components/EpubRenderer';
import { PdfRenderer } from '../../features/reader/components/PdfRenderer';
import { ArticleRenderer } from '../../features/reader/components/ArticleRenderer';
import { TTSMiniPlayer } from '../../features/tts/components/TTSMiniPlayer';
import { useReadingProgress } from '../../features/reader/hooks';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useUIStore((s) => s.colors);
  const { controlsVisible, toggleControls, setContentId, reset } = useReaderStore();
  const { updatePosition } = useReadingProgress(id);
  const [content, setContent] = useState<ContentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setContentId(id);
    loadContent(id);
    return () => reset();
  }, [id]);

  const loadContent = async (contentId: string) => {
    try {
      setLoading(true);
      const [item] = await db.getAll<any>(
        `SELECT * FROM content_items WHERE id = ? AND deleted_at IS NULL`,
        [contentId],
      );
      if (!item) {
        setError('Content not found');
        return;
      }

      if (item.type === 'book') {
        const [details] = await db.getAll<BookDetails>(
          `SELECT * FROM book_details WHERE content_id = ?`,
          [contentId],
        );
        if (!details) {
          setError('Book details not found');
          return;
        }
        setContent({ ...item, type: 'book', details });
      } else {
        const [details] = await db.getAll<ArticleDetails>(
          `SELECT * FROM article_details WHERE content_id = ?`,
          [contentId],
        );
        if (!details) {
          setError('Article details not found');
          return;
        }
        setContent({ ...item, type: 'article', details });
      }
    } catch (err) {
      setError('Failed to load content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTap = useCallback(() => {
    toggleControls();
  }, [toggleControls]);

  const handlePositionChange = useCallback(
    (data: { chapterIndex?: number; charOffset: number; percentage: number; page?: number }) => {
      updatePosition(
        {
          chapterIndex: data.chapterIndex,
          charOffset: data.charOffset,
          page: data.page,
        },
        data.percentage,
      );
    },
    [updatePosition],
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.readerBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !content) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.readerBackground }]}>
        <Text style={{ color: colors.error, fontSize: 16 }}>{error ?? 'Unknown error'}</Text>
      </View>
    );
  }

  const renderContent = () => {
    if (content.type === 'book') {
      const format = content.details.format;
      if (format === 'pdf') {
        return <PdfRenderer filePath={content.details.file_path} onPageChange={handlePositionChange} />;
      }
      // EPUB, TXT
      return <EpubRenderer filePath={content.details.file_path} format={format} onPositionChange={handlePositionChange} />;
    }
    // Article
    return <ArticleRenderer html={content.details.html_content} onPositionChange={handlePositionChange} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.readerBackground }]}>
      <TouchableWithoutFeedback onPress={handleTap} accessible={false}>
        <View style={styles.readerArea}>{renderContent()}</View>
      </TouchableWithoutFeedback>

      {controlsVisible && (
        <ReaderToolbar
          title={content.title}
          onBack={() => router.back()}
          contentId={content.id}
        />
      )}

      <TTSMiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  readerArea: { flex: 1 },
});
