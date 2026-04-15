import type { NovelSource, NovelInfo, ChapterInfo, ChapterContent, SourcePage } from './types';

const UNAVAILABLE = 'LightNovelPub has shut down and is no longer available.';
const EMPTY_PAGE: SourcePage<NovelInfo> = { items: [], hasNextPage: false, currentPage: 1 };

/**
 * LightNovelPub source — DEFUNCT.
 * The site shut down and now redirects to novelcodex.com (a tracking-only platform).
 * All methods return empty results or throw with a clear message.
 */
export class LightNovelPubSource implements NovelSource {
  id = 'lightnovelpub';
  name = 'LightNovelPub (Unavailable)';
  baseUrl = 'https://www.lightnovelpub.com';
  language = 'en';
  supportsSearch = false;
  genres: string[] = [];

  async getPopular(_page: number): Promise<SourcePage<NovelInfo>> {
    return EMPTY_PAGE;
  }

  async getLatest(_page: number): Promise<SourcePage<NovelInfo>> {
    return EMPTY_PAGE;
  }

  async search(_query: string, _page: number): Promise<SourcePage<NovelInfo>> {
    return EMPTY_PAGE;
  }

  async getNovelDetails(_novelId: string): Promise<NovelInfo> {
    throw new Error(UNAVAILABLE);
  }

  async getChapterList(_novelId: string): Promise<ChapterInfo[]> {
    throw new Error(UNAVAILABLE);
  }

  async getChapterContent(_novelId: string, _chapterId: string): Promise<ChapterContent> {
    throw new Error(UNAVAILABLE);
  }
}
