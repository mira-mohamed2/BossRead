// Core content types for ReadFlow

export type ContentType = 'book' | 'article';
export type BookFormat = 'epub' | 'pdf' | 'mobi' | 'txt';
export type AnnotationType = 'highlight' | 'note' | 'bookmark';
export type ThemeMode = 'light' | 'dark' | 'sepia' | 'amoled';

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  author: string | null;
  cover_uri: string | null;
  language: string;
  word_count: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id: string;
}

export interface BookDetails {
  content_id: string;
  format: BookFormat;
  file_path: string;
  file_hash: string;
  file_size: number;
  total_pages: number | null;
  publisher: string | null;
  isbn: string | null;
}

export interface ArticleDetails {
  content_id: string;
  url: string;
  site_name: string | null;
  excerpt: string | null;
  html_content: string;
  estimated_read_minutes: number | null;
}

/** Unified content with details joined */
export type BookWithDetails = ContentItem & { type: 'book'; details: BookDetails };
export type ArticleWithDetails = ContentItem & { type: 'article'; details: ArticleDetails };
export type ContentWithDetails = BookWithDetails | ArticleWithDetails;
