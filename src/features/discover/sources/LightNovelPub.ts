import type { NovelSource, NovelInfo, ChapterInfo, ChapterContent, SourcePage } from './types';
import { fetchHtml, extractText, extractAll, extractAttr, stripTags, cleanChapterHtml, decodeEntities } from './scraper';

/**
 * LightNovelPub.vip source — popular light novel aggregator.
 */
export class LightNovelPubSource implements NovelSource {
  id = 'lightnovelpub';
  name = 'LightNovelPub';
  baseUrl = 'https://www.lightnovelpub.com';
  language = 'en';
  iconUrl = 'https://www.lightnovelpub.com/favicon.ico';
  supportsSearch = true;
  genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Eastern', 'Fantasy',
    'Harem', 'Historical', 'Horror', 'Josei', 'Martial Arts', 'Mature',
    'Mecha', 'Mystery', 'Romance', 'Sci-fi', 'Seinen', 'Shoujo',
    'Shounen', 'Slice of Life', 'Supernatural', 'Tragedy', 'Wuxia', 'Xianxia',
  ];

  async getPopular(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/ranking/popular/all/${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getLatest(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/latest/${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async search(query: string, page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getNovelDetails(novelId: string): Promise<NovelInfo> {
    const url = `${this.baseUrl}/novel/${novelId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h1[^>]*class="[^"]*novel-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;
    const author = extractText(html, /<span[^>]*>Author[^<]*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i)
      ?? extractText(html, /<a[^>]*class="[^"]*property-item[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const coverUrl = extractAttr(html, /<figure[^>]*class="[^"]*cover[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i)
      ?? extractAttr(html, /<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i);
    const description = extractText(html, /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const genreMatches = extractAll(html, /<a[^>]*href="[^"]*genre[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
    const statusText = extractText(html, /<span[^>]*>Status[^<]*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i) ?? '';

    return {
      id: novelId,
      title: stripTags(title),
      author: author ? stripTags(author) : null,
      coverUrl: coverUrl ? this.resolveUrl(coverUrl) : null,
      description: description ? stripTags(description).substring(0, 500) : null,
      genres: genreMatches.map(stripTags),
      status: this.parseStatus(statusText),
      sourceId: this.id,
      url,
    };
  }

  async getChapterList(novelId: string): Promise<ChapterInfo[]> {
    const chapters: ChapterInfo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${this.baseUrl}/novel/${novelId}/chapters?page=${page}`;
      const html = await fetchHtml(url);

      const linkPattern = /<a[^>]*href="(\/novel\/[^"]*\/chapter-[^"]+)"[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/gi;
      let match: RegExpExecArray | null;
      let foundAny = false;

      while ((match = linkPattern.exec(html)) !== null) {
        const chapterPath = match[1];
        const chapterSlug = chapterPath.split('/').pop() ?? '';

        chapters.push({
          id: chapterSlug,
          title: decodeEntities(stripTags(match[2])),
          chapterNumber: chapters.length + 1,
          dateUploaded: null,
          url: `${this.baseUrl}${chapterPath}`,
        });
        foundAny = true;
      }

      hasMore = foundAny && html.includes(`page=${page + 1}`);
      page++;
      if (page > 50) break; // safety limit
    }

    return chapters;
  }

  async getChapterContent(novelId: string, chapterId: string): Promise<ChapterContent> {
    const url = `${this.baseUrl}/novel/${novelId}/${chapterId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<span[^>]*class="[^"]*chapter-title[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
      ?? extractText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i) ?? chapterId;
    const content = extractText(html, /<div[^>]*id="chapter-container"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*class="[^"]*chapter-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ?? '';
    const novelTitle = extractText(html, /<a[^>]*class="[^"]*novel-title[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ?? novelId;

    const prevMatch = extractAttr(html, /class="[^"]*prev[^"]*"[^>]*href="[^"]*\/([^/"]+)"/i);
    const nextMatch = extractAttr(html, /class="[^"]*next[^"]*"[^>]*href="[^"]*\/([^/"]+)"/i);

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
    const cardPattern = /<div[^>]*class="[^"]*novel-item[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*novel-item|<\/ul>|$)/gi;
    let cardMatch: RegExpExecArray | null;

    while ((cardMatch = cardPattern.exec(html)) !== null) {
      const card = cardMatch[1];
      const href = extractAttr(card, /<a[^>]*href="(\/novel\/[^"]+)"/i);
      if (!href) continue;

      const titleText = extractText(card, /<h4[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)
        ?? extractText(card, /<a[^>]*title="([^"]+)"/i);
      if (!titleText) continue;

      const cover = extractAttr(card, /<img[^>]*(?:src|data-src)="([^"]+)"/i);
      const slug = href.replace('/novel/', '').replace(/\/$/, '');

      items.push({
        id: slug,
        title: stripTags(decodeEntities(titleText)),
        author: null,
        coverUrl: cover ? this.resolveUrl(cover) : null,
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

  private resolveUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private parseStatus(text: string): NovelInfo['status'] {
    const lower = stripTags(text).toLowerCase();
    if (lower.includes('ongoing')) return 'ongoing';
    if (lower.includes('completed')) return 'completed';
    if (lower.includes('hiatus')) return 'hiatus';
    return 'unknown';
  }
}
