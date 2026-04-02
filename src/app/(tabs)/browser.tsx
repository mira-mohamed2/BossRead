import { useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore, useBrowserStore, useAuthStore } from '../../stores';
import { isValidUrl, normalizeUrl, generateId } from '../../utils';
import { db } from '../../services/powersync';

// Readability.js injection script for extracting article content
const READABILITY_INJECT = `
(function() {
  try {
    // Simplified content extraction — in production, inject full Readability.js
    var article = document.querySelector('article') || document.body;
    var title = document.title;
    var content = article.innerHTML;
    var siteName = window.location.hostname;
    
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'article_extracted',
      title: title,
      content: content,
      siteName: siteName,
      url: window.location.href,
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'extraction_error',
      error: e.message,
    }));
  }
})();
true;
`;

export default function BrowserScreen() {
  const webViewRef = useRef<WebView>(null);
  const colors = useUIStore((s) => s.colors);
  const userId = useAuthStore((s) => s.userId);
  const {
    url,
    isLoading,
    canGoBack,
    canGoForward,
    setUrl,
    setLoading,
    setCanGoBack,
    setCanGoForward,
    setPageTitle,
  } = useBrowserStore();
  const [inputUrl, setInputUrl] = useState('');

  const handleGo = useCallback(() => {
    Keyboard.dismiss();
    const normalized = normalizeUrl(inputUrl);
    if (!isValidUrl(normalized)) {
      Alert.alert('Invalid URL', 'Please enter a valid web address');
      return;
    }
    setUrl(normalized);
  }, [inputUrl, setUrl]);

  const handleNavigationChange = (nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    setCanGoForward(nav.canGoForward);
    setPageTitle(nav.title);
    if (nav.url) {
      setInputUrl(nav.url);
    }
  };

  const handleSaveArticle = async () => {
    if (!webViewRef.current || !userId) return;
    webViewRef.current.injectJavaScript(READABILITY_INJECT);
  };

  const handleWebViewMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'article_extracted' && userId) {
        const id = generateId();
        const now = new Date().toISOString();

        await db.writeTransaction(async (tx) => {
          await tx.execute(
            `INSERT INTO content_items (id, type, title, author, cover_uri, language, word_count, created_at, updated_at, deleted_at, user_id)
             VALUES (?, 'article', ?, NULL, NULL, 'en', NULL, ?, ?, NULL, ?)`,
            [id, data.title, now, now, userId],
          );
          await tx.execute(
            `INSERT INTO article_details (id, content_id, url, site_name, excerpt, html_content, estimated_read_minutes)
             VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
            [generateId(), id, data.url, data.siteName, data.content],
          );
        });

        Alert.alert('Saved', `"${data.title}" saved to library`);
      } else if (data.type === 'extraction_error') {
        Alert.alert('Error', 'Could not extract article content');
      }
    } catch (err) {
      console.error('WebView message handling failed:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* URL bar */}
      <View style={styles.urlBar}>
        <View
          style={[
            styles.urlInputContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.urlInput, { color: colors.text }]}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="Enter URL..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleGo}
            selectTextOnFocus
          />
          {inputUrl.length > 0 && (
            <TouchableOpacity onPress={() => setInputUrl('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* WebView */}
      {url ? (
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsBackForwardNavigationGestures
        />
      ) : (
        <View style={[styles.empty, { backgroundColor: colors.background }]}>
          <Ionicons name="globe-outline" size={64} color={colors.textSecondary} />
        </View>
      )}

      {/* Bottom navigation bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
          style={styles.navButton}
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={canGoBack ? colors.text : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
          style={styles.navButton}
          accessibilityLabel="Go forward"
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canGoForward ? colors.text : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => webViewRef.current?.reload()}
          style={styles.navButton}
          accessibilityLabel="Reload page"
        >
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSaveArticle}
          style={styles.navButton}
          disabled={!url}
          accessibilityLabel="Save article to library"
        >
          <Ionicons
            name="bookmark-outline"
            size={22}
            color={url ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  urlBar: { paddingHorizontal: 12, paddingVertical: 8 },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  urlInput: { flex: 1, fontSize: 14, height: '100%' },
  webview: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
