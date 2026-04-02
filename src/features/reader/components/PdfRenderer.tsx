import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useUIStore, useReaderStore } from '../../../stores';

interface PdfRendererProps {
  filePath: string;
  onPageChange?: (data: { page: number; charOffset: number; percentage: number }) => void;
}

/**
 * Renders PDF files using react-native-pdf.
 * Requires a development build (native module).
 * Falls back gracefully if the module isn't available.
 */
export function PdfRenderer({ filePath, onPageChange }: PdfRendererProps) {
  const colors = useUIStore((s) => s.colors);
  const savedPage = useReaderStore((s) => s.position.page);
  const [currentPage, setCurrentPage] = useState(savedPage ?? 1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // react-native-pdf requires native build — dynamic import with fallback
  let PdfView: any = null;
  try {
    PdfView = require('react-native-pdf').default;
  } catch {
    // Not available in Expo Go
  }

  if (!PdfView) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.readerBackground }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', padding: 32 }}>
          PDF rendering requires a development build.{'\n'}
          Run `npx expo prebuild` to enable native PDF support.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.readerBackground }]}>
      <PdfView
        source={{ uri: filePath }}
        style={styles.pdf}
        onLoadComplete={(numberOfPages: number) => setTotalPages(numberOfPages)}
        page={savedPage ?? 1}
        onPageChanged={(page: number) => {
          setCurrentPage(page);
          if (onPageChange && totalPages > 0) {
            onPageChange({ page, charOffset: 0, percentage: Math.round((page / totalPages) * 10000) / 100 });
          }
        }}
        onError={(err: any) => setError(String(err))}
        enablePaging
        horizontal={false}
        spacing={8}
      />
      {totalPages > 0 && (
        <View style={[styles.pageIndicator, { backgroundColor: colors.surface + 'CC' }]}>
          <Text style={[styles.pageText, { color: colors.text }]}>
            {currentPage} / {totalPages}
          </Text>
        </View>
      )}
      {error && (
        <View style={styles.errorOverlay}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pdf: { flex: 1 },
  pageIndicator: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageText: { fontSize: 14, fontWeight: '500' },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
