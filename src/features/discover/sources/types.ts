/**
 * Extension source system types — Tachiyomi/Webu-style pluggable novel sources.
 */

export interface NovelInfo {
  id: string;            // source-specific ID or slug
  title: string;
  author: string | null;
  coverUrl: string | null;
  description: string | null;
  genres: string[];
  status: 'ongoing' | 'completed' | 'hiatus' | 'unknown';
  sourceId: string;      // which source this came from
  url: string;           // canonical URL on the source site
}

export interface ChapterInfo {
  id: string;            // source-specific chapter ID or slug
  title: string;
  chapterNumber: number | null;
  dateUploaded: string | null;
  url: string;
}

export interface ChapterContent {
  title: string;
  htmlContent: string;   // cleaned HTML body
  novelTitle: string;
  prevChapterId: string | null;
  nextChapterId: string | null;
}

export interface NovelFilter {
  query?: string;
  genre?: string;
  status?: 'ongoing' | 'completed';
  sort?: 'popular' | 'latest' | 'alphabetical';
  page?: number;
}

export interface SourcePage<T> {
  items: T[];
  hasNextPage: boolean;
  currentPage: number;
}

/**
 * Base interface for all novel sources / extensions.
 * Each source implements scraping logic for a specific website.
 */
export interface NovelSource {
  /** Unique source identifier */
  id: string;
  /** Display name */
  name: string;
  /** Base URL of the source website */
  baseUrl: string;
  /** Language code (e.g. 'en') */
  language: string;
  /** Source icon URL or local asset identifier */
  iconUrl?: string;
  /** Whether this source supports search */
  supportsSearch: boolean;
  /** Available genres for filtering */
  genres: string[];

  /** Get popular/trending novels */
  getPopular(page: number): Promise<SourcePage<NovelInfo>>;

  /** Get latest updated novels */
  getLatest(page: number): Promise<SourcePage<NovelInfo>>;

  /** Search novels by query */
  search(query: string, page: number): Promise<SourcePage<NovelInfo>>;

  /** Get full novel details */
  getNovelDetails(novelId: string): Promise<NovelInfo>;

  /** Get chapter list for a novel */
  getChapterList(novelId: string): Promise<ChapterInfo[]>;

  /** Get chapter content */
  getChapterContent(novelId: string, chapterId: string): Promise<ChapterContent>;
}
