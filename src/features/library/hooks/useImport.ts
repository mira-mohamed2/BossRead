import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File, Directory, Paths } from 'expo-file-system';
import { db } from '../../../services/powersync';
import { useAuthStore } from '../../../stores';
import { generateId } from '../../../utils';
import { BookFormat } from '../../../types';

const SUPPORTED_TYPES: Record<string, BookFormat> = {
  'application/epub+zip': 'epub',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

const SUPPORTED_EXTENSIONS: Record<string, BookFormat> = {
  '.epub': 'epub',
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.mobi': 'mobi',
};

export function useImport() {
  const userId = useAuthStore((s) => s.userId);
  const [importing, setImporting] = useState(false);

  const importBook = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/epub+zip',
          'application/pdf',
          'text/plain',
          'application/x-mobipocket-ebook',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return null;

      setImporting(true);
      const asset = result.assets[0];
      const fileName = asset.name;
      const fileUri = asset.uri;
      const mimeType = asset.mimeType ?? '';

      // Determine format
      const ext = '.' + fileName.split('.').pop()?.toLowerCase();
      const format =
        SUPPORTED_TYPES[mimeType] ?? SUPPORTED_EXTENSIONS[ext];
      if (!format) {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      // Copy file to permanent app storage
      const booksDir = new Directory(Paths.document, 'books');
      booksDir.create();
      const id = generateId();
      const destFileName = `${id}${ext}`;
      const sourceFile = new File(fileUri);
      sourceFile.copy(new File(booksDir, destFileName));
      const destPath = new File(booksDir, destFileName).uri;

      // Get file info
      const destFile = new File(booksDir, destFileName);
      const fileSize = destFile.size ?? 0;

      // Extract title from filename (strip extension)
      const title = fileName.replace(/\.[^.]+$/, '');
      const now = new Date().toISOString();

      // Insert content item and book details in a write transaction
      await db.writeTransaction(async (tx) => {
        await tx.execute(
          `INSERT INTO content_items (id, type, title, author, cover_uri, language, word_count, created_at, updated_at, deleted_at, user_id)
           VALUES (?, 'book', ?, NULL, NULL, 'en', NULL, ?, ?, NULL, ?)`,
          [id, title, now, now, userId],
        );
        await tx.execute(
          `INSERT INTO book_details (id, content_id, format, file_path, file_hash, file_size, total_pages, publisher, isbn)
           VALUES (?, ?, ?, ?, '', ?, NULL, NULL, NULL)`,
          [generateId(), id, format, destPath, fileSize],
        );
      });

      return id;
    } catch (err) {
      console.error('Import failed:', err);
      throw err;
    } finally {
      setImporting(false);
    }
  }, [userId]);

  return { importBook, importing };
}
