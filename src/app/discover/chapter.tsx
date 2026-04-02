import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../stores';
import { getSourceById } from '../../features/discover/sources';
import type { ChapterContent } from '../../features/discover/sources';

export default function ChapterReaderScreen() {
  const { sourceId, novelId, chapterId, novelTitle } = useLocalSearchParams<{
    sourceId: string;
    novelId: string;
    chapterId: string;
    novelTitle: string;
  }>();
  const router = useRouter();
  const colors = useUIStore((s) => s.colors);
  const fontSize = useUIStore((s) => s.fontSize);
  const lineHeight = useUIStore((s) => s.lineHeight);

  const [chapter, setChapter] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const source = getSourceById(sourceId);

  const loadChapter = useCallback(async (chapId: string) => {
    if (!source) return;
    setLoading(true);
    try {
      const content = await source.getChapterContent(novelId, chapId);
      setChapter(content);
    } catch (err) {
      console.error('Failed to load chapter:', err);
    } finally {
      setLoading(false);
    }
  }, [source, novelId]);

  useEffect(() => {
    if (chapterId) loadChapter(chapterId);
  }, [chapterId]);

  const navigateChapter = (newChapterId: string) => {
    router.setParams({ chapterId: newChapterId });
  };

  const readerHtml = chapter ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${colors.readerBackground};
          color: ${colors.readerText};
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
          padding: 16px;
          word-wrap: break-word;
          -webkit-text-size-adjust: none;
        }
        h1, h2, h3 { margin: 16px 0 8px; line-height: 1.3; }
        p { margin-bottom: 12px; }
        img { max-width: 100%; height: auto; }
        a { color: ${colors.primary}; }
        .chapter-title {
          font-size: 1.3em;
          font-weight: 700;
          margin-bottom: 20px;
          border-bottom: 1px solid ${colors.border};
          padding-bottom: 12px;
        }
      </style>
    </head>
    <body>
      <div class="chapter-title">${chapter.title}</div>
      ${chapter.htmlContent}
      <div style="height: 60px;"></div>
    </body>
    </html>
  ` : '';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.readerBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.readerBackground }]}>
      {/* Top toolbar */}
      {toolbarVisible && (
        <View style={[styles.toolbar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.toolbarTitle}>
            <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
              {chapter?.title ?? 'Chapter'}
            </Text>
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]} numberOfLines={1}>
              {novelTitle || chapter?.novelTitle}
            </Text>
          </View>
        </View>
      )}

      {/* Chapter content */}
      {chapter && (
        <WebView
          ref={webViewRef}
          source={{ html: readerHtml }}
          style={{ flex: 1, backgroundColor: colors.readerBackground }}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          onMessage={() => setToolbarVisible((v) => !v)}
          injectedJavaScript={`
            document.body.addEventListener('click', function() {
              window.ReactNativeWebView.postMessage('tap');
            });
            true;
          `}
        />
      )}

      {/* Bottom navigation */}
      {toolbarVisible && chapter && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.navBtn, { opacity: chapter.prevChapterId ? 1 : 0.3 }]}
            onPress={() => chapter.prevChapterId && navigateChapter(chapter.prevChapterId)}
            disabled={!chapter.prevChapterId}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={[styles.navText, { color: colors.text }]}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, { opacity: chapter.nextChapterId ? 1 : 0.3 }]}
            onPress={() => chapter.nextChapterId && navigateChapter(chapter.nextChapterId)}
            disabled={!chapter.nextChapterId}
          >
            <Text style={[styles.navText, { color: colors.text }]}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  toolbarBtn: { padding: 4 },
  toolbarTitle: { flex: 1 },
  titleText: { fontSize: 16, fontWeight: '600' },
  subtitleText: { fontSize: 12 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navText: { fontSize: 15, fontWeight: '500' },
});
