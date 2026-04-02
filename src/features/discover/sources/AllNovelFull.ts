import type { NovelSource, NovelInfo, ChapterInfo, ChapterContent, SourcePage } from './types';
import { fetchHtml, extractText, extractAll, extractAttr, stripTags, cleanChapterHtml, decodeEntities } from './scraper';

/**
 * AllNovelFull.net source — large English web novel / light novel library.
 */
export class AllNovelFullSource implements NovelSource {
  id = 'allnovelfull';
  name = 'AllNovelFull';
  baseUrl = 'https://allnovelfull.net';
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

  async search(query: string, page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getNovelDetails(novelId: string): Promise<NovelInfo> {
    const url = `${this.baseUrl}/${novelId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h3 class="title"[^>]*>([\s\S]*?)<\/h3>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;
    const author = extractText(html, /Author[^<]*<\/th>\s*<td[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i);
    const coverUrl = extractAttr(html, /<div class="book"[^>]*>\s*<img[^>]*src="([^"]+)"/i);
    const description = extractText(html, /<div class="desc-text"[^>]*>([\s\S]*?)<\/div>/i);
    const genreMatches = extractAll(html, /<a[^>]*href="[^"]*genre[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
    const statusText = extractText(html, /Status[^<]*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ?? '';

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
    const url = `${this.baseUrl}/${novelId}`;
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
    const url = `${this.baseUrl}/${novelId}/${chapterId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<a class="chr-title"[^>]*>([\s\S]*?)<\/a>/i)
      ?? extractText(html, /<span class="chr-text"[^>]*>([\s\S]*?)<\/span>/i) ?? chapterId;
    const content = extractText(html, /<div id="chr-content"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div class="chr-c"[^>]*>([\s\S]*?)<\/div>/i) ?? '';
    const novelTitle = extractText(html, /<a class="novel-title"[^>]*>([\s\S]*?)<\/a>/i) ?? novelId;

    const prevMatch = extractAttr(html, /id="prev_chap"[^>]*href="[^"]*\/([^/"]+)"/i);
    const nextMatch = extractAttr(html, /id="next_chap"[^>]*href="[^"]*\/([^/"]+)"/i);

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
    const novelBlocks = html.split(/<div class="row"[^>]*>/gi).slice(1);

    for (const block of novelBlocks) {
      const href = extractAttr(block, /<a[^>]*href="([^"]+)"[^>]*class="[^"]*"[^>]*>/i)
        ?? extractAttr(block, /<h3[^>]*>\s*<a[^>]*href="([^"]+)"/i);
      if (!href) continue;

      const titleText = extractText(block, /<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleText) continue;

      const cover = extractAttr(block, /<img[^>]*src="([^"]+)"/i);
      const slug = href.replace(/^\//, '').replace(/\/$/, '');

      items.push({
        id: slug,
        title: stripTags(titleText),
        author: null,
        coverUrl: cover ? this.resolveUrl(cover) : null,
        description: null,
        genres: [],
        status: 'unknown',
        sourceId: this.id,
        url: `${this.baseUrl}/${slug}`,
      });
    }

    const hasNext = html.includes('class="next"') || html.includes('>Next<') || html.includes(`page=${page + 1}`);

    return { items, hasNextPage: hasNext, currentPage: page };
  }

  private parseChaptersFromPage(html: string, novelId: string): ChapterInfo[] {
    const chapters: ChapterInfo[] = [];
    const linkPattern = /<a[^>]*href="[^"]*\/([^/"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = linkPattern.exec(html)) !== null) {
      const chapterSlug = match[1];
      const chapterTitle = stripTags(match[2]);
      if (!chapterTitle || chapterSlug === novelId) continue;

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
