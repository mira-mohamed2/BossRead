import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useUIStore, useReaderStore } from '../../../stores';
import { BookFormat } from '../../../types';
import { parseEpub, readTxtFile } from '../../../services/parsers';
import type { EpubChapter } from '../../../services/parsers';

interface EpubRendererProps {
  filePath: string;
  format: BookFormat;
  onPositionChange?: (position: { chapterIndex: number; charOffset: number; percentage: number }) => void;
}

/**
 * Renders EPUB and TXT content in a WebView with theme-aware styling.
 * Parses EPUB spine chapters via JSZip + xmldom, then injects HTML.
 */
export function EpubRenderer({ filePath, format, onPositionChange }: EpubRendererProps) {
  const webViewRef = useRef<WebView>(null);
  const colors = useUIStore((s) => s.colors);
  const fontSize = useUIStore((s) => s.fontSize);
  const lineHeight = useUIStore((s) => s.lineHeight);
  const fontFamily = useUIStore((s) => s.fontFamily);
  const position = useReaderStore((s) => s.position);

  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  // Load and parse content on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        if (format === 'epub') {
          const result = await parseEpub(filePath);
          if (!cancelled) setChapters(result.chapters);
        } else if (format === 'txt') {
          const html = await readTxtFile(filePath);
          if (!cancelled) setChapters([{ title: 'Content', html }]);
        }
      } catch (err: any) {
        if (!cancelled) setParseError(err?.message ?? 'Failed to parse file');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filePath, format]);

  // Generate reader CSS based on current theme and font settings
  const readerCSS = `
    * { box-sizing: border-box; }
    body {
      background-color: ${colors.readerBackground};
      color: ${colors.readerText};
      font-family: ${fontFamily === 'system' ? 'system-ui, sans-serif' : fontFamily};
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      padding: 16px 24px;
      margin: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      -webkit-user-select: text;
      user-select: text;
    }
    img { max-width: 100%; height: auto; }
    a { color: ${colors.primary}; }
    h1, h2, h3, h4, h5, h6 { color: ${colors.readerText}; margin-top: 1.4em; }
    .chapter-separator {
      border: none;
      border-top: 1px solid ${colors.textSecondary}33;
      margin: 2em 0;
    }
    .chapter-heading {
      font-size: 1.3em;
      font-weight: 700;
      margin-bottom: 0.8em;
      color: ${colors.readerText};
    }
    .tts-highlight {
      background-color: ${colors.primary}33;
      border-radius: 2px;
    }
  `;

  // Build combined chapter HTML
  const chaptersHtml = chapters
    .map((ch, i) => {
      const separator = i > 0 ? '<hr class="chapter-separator" />' : '';
      return `${separator}<section data-chapter="${i}"><div class="chapter-heading">${ch.title}</div>${ch.html}</section>`;
    })
    .join('\n');

  // JS bridge to report scroll position back to RN
  const bridgeJS = `
    (function() {
      var totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      var ticking = false;

      function reportPosition() {
        var scrollY = window.scrollY || window.pageYOffset;
        var pct = totalHeight > 0 ? Math.min(scrollY / totalHeight, 1) : 0;
        var chapter = 0;
        var sections = document.querySelectorAll('section[data-chapter]');
        for (var i = sections.length - 1; i >= 0; i--) {
          if (sections[i].getBoundingClientRect().top <= 10) {
            chapter = parseInt(sections[i].getAttribute('data-chapter'), 10);
            break;
          }
        }
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'position',
          chapterIndex: chapter,
          charOffset: Math.round(scrollY),
          percentage: Math.round(pct * 10000) / 100
        }));
      }

      window.addEventListener('scroll', function() {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(function() {
            reportPosition();
            ticking = false;
          });
        }
      });

      // Restore position if provided
      var initialOffset = ${position?.charOffset ?? 0};
      if (initialOffset > 0) {
        window.scrollTo(0, initialOffset);
      }

      // Recalculate after images load
      window.addEventListener('load', function() {
        totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (initialOffset > 0) window.scrollTo(0, initialOffset);
      });
    })();
    true;
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>${readerCSS}</style>
    </head>
    <body>
      ${chaptersHtml || '<p>No content found.</p>'}
      <script>${bridgeJS}</script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (parseError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: colors.error }}>{parseError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={[styles.webview, { backgroundColor: colors.readerBackground }]}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        showsVerticalScrollIndicator={false}
        scrollEnabled
        textZoom={100}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'position' && onPositionChange) {
              onPositionChange(data);
            }
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  webview: { flex: 1 },
});
