import type { NovelSource, NovelInfo, ChapterInfo, ChapterContent, SourcePage } from './types';
import { fetchHtml, extractText, extractAll, extractAttr, stripTags, cleanChapterHtml, decodeEntities } from './scraper';

/**
 * AllNovelFull.net source — large English web novel / light novel library.
 */
export class AllNovelFullSource implements NovelSource {
  id = 'allnovelfull';
  name = 'NovGo';
  baseUrl = 'https://novgo.net';
  language = 'en';
  iconUrl = 'https://allnovelfull.net/favicon.ico';
  supportsSearch = true;
  genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Harem',
    'Historical', 'Horror', 'Martial Arts', 'Mature', 'Mystery',
    'Romance', 'Sci-fi', 'Supernatural', 'Tragedy', 'Wuxia', 'Xianxia',
  ];

  async getPopular(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/most-popular?page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getLatest(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/latest-release-novel?page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getByGenre(genre: string, page: number): Promise<SourcePage<NovelInfo>> {
    const slug = genre.toLowerCase().replace(/\s+/g, '-');
    const url = `${this.baseUrl}/genre/${slug}?page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async search(query: string, page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getNovelDetails(novelId: string): Promise<NovelInfo> {
    const url = `${this.baseUrl}/${novelId}.html`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h3 class="title"[^>]*>([\s\S]*?)<\/h3>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;
    const author = extractText(html, /Author[^<]*<\/(?:th|span)>\s*(?:<td[^>]*>|<span[^>]*>)?\s*<a[^>]*>([\s\S]*?)<\/a>/i)
      ?? extractText(html, /Author[^<]*<\/(?:th|span)>\s*(?:<td[^>]*>|<span[^>]*>)\s*([\s\S]*?)\s*<\/(?:td|span)>/i);
    const coverUrl = extractAttr(html, /<div class="book"[^>]*>\s*<img[^>]*src="([^"]+)"/i)
      ?? extractAttr(html, /<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i);
    const description = extractText(html, /<div class="desc-text"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const genreMatches = extractAll(html, /<a[^>]*href="[^"]*genre[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
    const statusText = extractText(html, /Status[^<]*<\/(?:th|span)>\s*(?:<td[^>]*>|<span[^>]*>)\s*([\s\S]*?)\s*<\/(?:td|span)>/i) ?? '';

    return {
      id: novelId,
      title: stripTags(title),
      author: author ? stripTags(author) : null,
      coverUrl: coverUrl ? this.resolveUrl(coverUrl) : null,
      description: description ? stripTags(description) : null,
      genres: genreMatches.map(stripTags),
      status: this.parseStatus(statusText),
      sourceId: this.id,
      url,
    };
  }

  async getChapterList(novelId: string): Promise<ChapterInfo[]> {
    const url = `${this.baseUrl}/${novelId}.html`;
    const html = await fetchHtml(url);

    // Extract novel id for AJAX chapter list
    const novelIdNum = extractAttr(html, /data-novel-id="(\d+)"/i);
    if (!novelIdNum) {
      // Fallback: parse chapters from page
      return this.parseChaptersFromPage(html, novelId);
    }

    // Try fetching full chapter list via AJAX
    try {
      const ajaxUrl = `${this.baseUrl}/ajax/chapter-archive?novelId=${novelIdNum}`;
      const chapterHtml = await fetchHtml(ajaxUrl);
      return this.parseChaptersFromPage(chapterHtml, novelId);
    } catch {
      return this.parseChaptersFromPage(html, novelId);
    }
  }

  async getChapterContent(novelId: string, chapterId: string): Promise<ChapterContent> {
    // novgo.net uses full slug URLs like /novel-name/chapter-slug.html
    const url = `${this.baseUrl}/${novelId}/${chapterId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<a class="chr-title"[^>]*>([\s\S]*?)<\/a>/i)
      ?? extractText(html, /<span class="chr-text"[^>]*>([\s\S]*?)<\/span>/i)
      ?? extractText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i) ?? chapterId;
    const content = extractText(html, /<div id="chr-content"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div class="chr-c"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*id="chapter-content"[^>]*>([\s\S]*?)<\/div>/i) ?? '';
    const novelTitle = extractText(html, /<a class="novel-title"[^>]*>([\s\S]*?)<\/a>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;

    const prevMatch = extractAttr(html, /id="prev_chap"[^>]*href="[^"]*\/([^/"]+)"/i)
      ?? extractAttr(html, /class="[^"]*prev[^"]*"[^>]*href="[^"]*\/([^/"]+)"/i);
    const nextMatch = extractAttr(html, /id="next_chap"[^>]*href="[^"]*\/([^/"]+)"/i)
      ?? extractAttr(html, /class="[^"]*next[^"]*"[^>]*href="[^"]*\/([^/"]+)"/i);

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

    // Match novel links — novgo.net uses <h3><a href="/slug.html">Title</a></h3>
    const novelPattern = /<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/gi;
    let match: RegExpExecArray | null;

    while ((match = novelPattern.exec(html)) !== null) {
      const href = match[1];
      const titleText = match[2];
      if (!titleText?.trim()) continue;

      // Extract cover image near this link
      const nearbyHtml = html.substring(Math.max(0, match.index - 500), match.index + match[0].length + 200);
      const cover = extractAttr(nearbyHtml, /<img[^>]*src="([^"]+)"/i);

      // Derive slug from href: /hidden-marriage.html → hidden-marriage
      const slug = href.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');

      items.push({
        id: slug,
        title: stripTags(decodeEntities(titleText)),
        author: null,
        coverUrl: cover ? this.resolveUrl(cover) : null,
        description: null,
        genres: [],
        status: 'unknown',
        sourceId: this.id,
        url: `${this.baseUrl}/${slug}.html`,
      });
    }

    const hasNext = html.includes('class="next"') || html.includes('>Next<') || html.includes(`page=${page + 1}`);

    return { items, hasNextPage: hasNext, currentPage: page };
  }

  private parseChaptersFromPage(html: string, novelId: string): ChapterInfo[] {
    const chapters: ChapterInfo[] = [];
    // Match chapter links that contain the novel slug in the href
    const escapedNovelId = novelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkPattern = new RegExp(
      `<a[^>]*href="[^"]*/${escapedNovelId}/([^"]+)"[^>]*>\\s*([\\s\\S]*?)\\s*</a>`,
      'gi',
    );
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = linkPattern.exec(html)) !== null) {
      const chapterSlug = match[1].replace(/\.html$/, '');
      const chapterTitle = stripTags(match[2]);
      if (!chapterTitle) continue;

      chapters.push({
        id: chapterSlug,
        title: decodeEntities(chapterTitle),
        chapterNumber: index + 1,
        dateUploaded: null,
        url: `${this.baseUrl}/${novelId}/${chapterSlug}`,
      });
      index++;
    }

    return chapters;
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private parseStatus(text: string): NovelInfo['status'] {
    const lower = stripTags(text).toLowerCase();
    if (lower.includes('ongoing') || lower.includes('active')) return 'ongoing';
    if (lower.includes('completed') || lower.includes('finished')) return 'completed';
    if (lower.includes('hiatus')) return 'hiatus';
    return 'unknown';
  }
}
