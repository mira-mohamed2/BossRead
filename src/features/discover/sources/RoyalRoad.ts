import type { NovelSource, NovelInfo, ChapterInfo, ChapterContent, SourcePage } from './types';
import { fetchHtml, extractText, extractAll, extractAttr, stripTags, cleanChapterHtml, decodeEntities } from './scraper';

/**
 * RoyalRoad.com source — popular English web fiction / progression fantasy platform.
 */
export class RoyalRoadSource implements NovelSource {
  id = 'royalroad';
  name = 'Royal Road';
  baseUrl = 'https://www.royalroad.com';
  language = 'en';
  iconUrl = 'https://www.royalroad.com/favicon.ico';
  supportsSearch = true;
  genres = [
    'Action', 'Adventure', 'Comedy', 'Contemporary', 'Drama', 'Fantasy',
    'Historical', 'Horror', 'LitRPG', 'Mystery', 'Psychological',
    'Romance', 'Satire', 'Sci-fi', 'Short Story', 'Tragedy',
  ];

  async getPopular(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/fictions/best-rated?page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getLatest(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/fictions/latest-updates?page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async search(query: string, page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/fictions/search?title=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getNovelDetails(novelId: string): Promise<NovelInfo> {
    const url = `${this.baseUrl}/fiction/${novelId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h1[^>]*property="name"[^>]*>([\s\S]*?)<\/h1>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;
    const author = extractText(html, /<span[^>]*property="name"[^>]*>([\s\S]*?)<\/span>/i);
    const coverUrl = extractAttr(html, /<img[^>]*class="[^"]*thumbnail[^"]*"[^>]*src="([^"]+)"/i);
    const description = extractText(html, /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const genreMatches = extractAll(html, /<span class="tags"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/gi);
    const statusText = extractAttr(html, /<span[^>]*class="[^"]*label-\w+[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ?? '';

    return {
      id: novelId,
      title: stripTags(title),
      author: author ? stripTags(author) : null,
      coverUrl: coverUrl ?? null,
      description: description ? stripTags(description).substring(0, 500) : null,
      genres: genreMatches.map(stripTags),
      status: this.parseStatus(statusText),
      sourceId: this.id,
      url,
    };
  }

  async getChapterList(novelId: string): Promise<ChapterInfo[]> {
    const url = `${this.baseUrl}/fiction/${novelId}`;
    const html = await fetchHtml(url);

    const chapters: ChapterInfo[] = [];
    // RoyalRoad chapters are in a table with links like /fiction/12345/chapter/67890/chapter-title
    const chapterPattern = /<a[^>]*href="(\/fiction\/[^"]*\/chapter\/[^"]+)"[^>]*>\s*<span>([\s\S]*?)<\/span>/gi;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = chapterPattern.exec(html)) !== null) {
      const chapterPath = match[1];
      const parts = chapterPath.split('/');
      const chapterSlug = parts.slice(4).join('/'); // everything after /fiction/{id}/chapter/

      chapters.push({
        id: chapterSlug || `ch-${index}`,
        title: decodeEntities(stripTags(match[2])),
        chapterNumber: index + 1,
        dateUploaded: null,
        url: `${this.baseUrl}${chapterPath}`,
      });
      index++;
    }

    return chapters;
  }

  async getChapterContent(novelId: string, chapterId: string): Promise<ChapterContent> {
    const url = `${this.baseUrl}/fiction/${novelId}/chapter/${chapterId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h1[^>]*class="[^"]*font-white[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? chapterId;
    const content = extractText(html, /<div[^>]*class="[^"]*chapter-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ?? '';
    const novelTitle = extractText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i) ?? novelId;

    // Navigation links
    const prevMatch = extractAttr(html, /class="[^"]*btn-prev[^"]*"[^>]*href="[^"]*chapter\/([^"]+)"/i);
    const nextMatch = extractAttr(html, /class="[^"]*btn-next[^"]*"[^>]*href="[^"]*chapter\/([^"]+)"/i);

    return {
      title: stripTags(title),
      htmlContent: cleanChapterHtml(content),
      novelTitle: stripTags(novelTitle),
      prevChapterId: prevMatch ?? null,
      nextChapterId: nextMatch ?? null,
    };
  }

  private parseListPage(html: string, page: number): SourcePage<NovelInfo> {
    const items: NovelInfo[] = [];
    // RoyalRoad fiction cards
    const cardPattern = /<div[^>]*class="[^"]*fiction-list-item[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*fiction-list-item|$)/gi;
    let cardMatch: RegExpExecArray | null;

    while ((cardMatch = cardPattern.exec(html)) !== null) {
      const card = cardMatch[1];
      const href = extractAttr(card, /<a[^>]*href="(\/fiction\/[^"]+)"/i);
      if (!href) continue;

      const titleText = extractText(card, /<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleText) continue;

      const cover = extractAttr(card, /<img[^>]*src="([^"]+)"/i);
      const idMatch = href.match(/\/fiction\/(\d+[^/]*)/);
      const slug = idMatch ? idMatch[1] : href.replace('/fiction/', '');

      items.push({
        id: slug,
        title: stripTags(titleText),
        author: null,
        coverUrl: cover ?? null,
        description: null,
        genres: [],
        status: 'unknown',
        sourceId: this.id,
        url: `${this.baseUrl}${href}`,
      });
    }

    const hasNext = html.includes(`page=${page + 1}`) || html.includes('class="next"');
    return { items, hasNextPage: hasNext, currentPage: page };
  }

  private parseStatus(text: string): NovelInfo['status'] {
    const lower = stripTags(text).toLowerCase();
    if (lower.includes('ongoing') || lower.includes('active')) return 'ongoing';
    if (lower.includes('completed') || lower.includes('finished')) return 'completed';
    if (lower.includes('hiatus') || lower.includes('dropped')) return 'hiatus';
    return 'unknown';
  }
}
