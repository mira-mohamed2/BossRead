import { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useUIStore, useReaderStore } from '../../../stores';

interface ArticleRendererProps {
  html: string;
  onPositionChange?: (position: { charOffset: number; percentage: number }) => void;
}

/**
 * Renders parsed article HTML in a themed WebView.
 * The HTML has already been extracted and cleaned by Readability.
 */
export function ArticleRenderer({ html, onPositionChange }: ArticleRendererProps) {
  const webViewRef = useRef<WebView>(null);
  const colors = useUIStore((s) => s.colors);
  const fontSize = useUIStore((s) => s.fontSize);
  const lineHeight = useUIStore((s) => s.lineHeight);
  const fontFamily = useUIStore((s) => s.fontFamily);
  const position = useReaderStore((s) => s.position);

  const readerCSS = `
    * { box-sizing: border-box; }
    body {
      background-color: ${colors.readerBackground};
      color: ${colors.readerText};
      font-family: ${fontFamily === 'system' ? 'system-ui, sans-serif' : fontFamily};
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      padding: 16px 20px;
      margin: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
    a { color: ${colors.primary}; text-decoration: none; }
    blockquote {
      border-left: 3px solid ${colors.primary};
      padding-left: 16px;
      margin-left: 0;
      color: ${colors.textSecondary};
      font-style: italic;
    }
    pre, code {
      background-color: ${colors.surface};
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre { padding: 12px; overflow-x: auto; }
    .tts-highlight {
      background-color: ${colors.primary}33;
      border-radius: 2px;
    }
  `;

  // JS bridge for scroll position tracking and initial position restore
  const bridgeJS = `
    (function() {
      var totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      var ticking = false;

      function reportPosition() {
        var scrollY = window.scrollY || window.pageYOffset;
        var pct = totalHeight > 0 ? Math.min(scrollY / totalHeight, 1) : 0;
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'position',
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

      var initialOffset = ${position?.charOffset ?? 0};
      if (initialOffset > 0) window.scrollTo(0, initialOffset);
      window.addEventListener('load', function() {
        totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (initialOffset > 0) window.scrollTo(0, initialOffset);
      });
    })();
    true;
  `;

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>${readerCSS}</style>
    </head>
    <body>
      ${html}
      <script>${bridgeJS}</script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: fullHtml }}
        style={[styles.webview, { backgroundColor: colors.readerBackground }]}
        originWhitelist={['*']}
        javaScriptEnabled
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
  webview: { flex: 1 },
});
