import type { NovelSource, NovelInfo, ChapterInfo, ChapterContent, SourcePage } from './types';
import { fetchHtml, extractText, extractAll, extractAttr, stripTags, cleanChapterHtml, decodeEntities } from './scraper';

/**
 * FreeWebNovel.com source — large free web novel / light novel library.
 */
export class FreeWebNovelSource implements NovelSource {
  id = 'freewebnovel';
  name = 'FreeWebNovel';
  baseUrl = 'https://freewebnovel.com';
  language = 'en';
  iconUrl = 'https://freewebnovel.com/favicon.ico';
  supportsSearch = true;
  genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Eastern', 'Fantasy',
    'Harem', 'Historical', 'Horror', 'Isekai', 'Martial Arts', 'Mature',
    'Mystery', 'Psychological', 'Reincarnation', 'Romance', 'Sci-fi',
    'School Life', 'Slice of Life', 'Supernatural', 'Tragedy', 'Wuxia',
    'Xianxia', 'Xuanhuan', 'Yaoi', 'Yuri',
  ];

  async getPopular(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/sort/popular-novel/${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getLatest(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/sort/latest-release/${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async search(query: string, page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/search/?searchkey=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getNovelDetails(novelId: string): Promise<NovelInfo> {
    const url = `${this.baseUrl}/novel/${novelId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h1[^>]*class="[^"]*tit[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;
    const author = extractText(html, /Author[^<]*<\/(?:span|th|div)>\s*(?:<[^>]*>)*\s*([\s\S]*?)\s*<\/(?:span|a|td)/i);
    const coverUrl = extractAttr(html, /<div[^>]*class="[^"]*pic[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i)
      ?? extractAttr(html, /<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i)
      ?? extractAttr(html, /<img[^>]*src="(\/files\/article\/image\/[^"]+)"/i);
    const description = extractText(html, /<div[^>]*class="[^"]*inner[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const genreMatches = extractAll(html, /<a[^>]*href="[^"]*genre[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
    const statusText = extractText(html, /Status[^<]*<\/(?:span|th)>\s*(?:<[^>]*>)*\s*([\s\S]*?)\s*<\/(?:span|a|td)/i) ?? '';

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
    const url = `${this.baseUrl}/novel/${novelId}`;
    const html = await fetchHtml(url);

    const chapters: ChapterInfo[] = [];
    // Chapter links: /novel/{slug}/chapter-{n} or /novel/{slug}/{chapter-slug}
    const escapedSlug = novelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const chapterPattern = new RegExp(
      `<a[^>]*href="[^"]*\\/novel\\/${escapedSlug}\\/([^"]+)"[^>]*>\\s*([\\s\\S]*?)\\s*<\\/a>`,
      'gi',
    );
    let match: RegExpExecArray | null;
    let index = 0;
    const seen = new Set<string>();

    while ((match = chapterPattern.exec(html)) !== null) {
      const slug = match[1].replace(/\/$/, '');
      if (seen.has(slug)) continue;
      seen.add(slug);

      const titleText = stripTags(match[2]);
      if (!titleText || titleText.length < 2) continue;

      chapters.push({
        id: slug,
        title: decodeEntities(titleText),
        chapterNumber: index + 1,
        dateUploaded: null,
        url: `${this.baseUrl}/novel/${novelId}/${slug}`,
      });
      index++;
    }

    return chapters;
  }

  async getChapterContent(novelId: string, chapterId: string): Promise<ChapterContent> {
    const url = `${this.baseUrl}/novel/${novelId}/${chapterId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h1[^>]*class="[^"]*tit[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
      ?? extractText(html, /<span class="chapter"[^>]*>([\s\S]*?)<\/span>/i)
      ?? extractText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i) ?? chapterId;
    const content = extractText(html, /<div[^>]*class="[^"]*txt[^"]*"[^>]*id="article"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*id="article"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*class="[^"]*chapter-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ?? '';
    const novelTitle = extractText(html, /<a[^>]*class="[^"]*novel-title[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      ?? extractText(html, /<span class="novel"[^>]*>([\s\S]*?)<\/span>/i)
      ?? extractText(html, /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ?? novelId;

    const prevMatch = extractAttr(html, /class="[^"]*prev[^"]*"[^>]*href="[^"]*\/([^/"]+)"/i)
      ?? extractAttr(html, /id="prev_chap"[^>]*href="[^"]*\/([^/"]+)"/i);
    const nextMatch = extractAttr(html, /class="[^"]*next[^"]*"[^>]*href="[^"]*\/([^/"]+)"/i)
      ?? extractAttr(html, /id="next_chap"[^>]*href="[^"]*\/([^/"]+)"/i);

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

    // FreeWebNovel uses ### [Title](url) pattern with novel cards
    const novelPattern = /<h3[^>]*>\s*<a[^>]*href="\/novel\/([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/gi;
    let match: RegExpExecArray | null;

    while ((match = novelPattern.exec(html)) !== null) {
      const slug = match[1].replace(/\/$/, '');
      const titleText = match[2];
      if (!titleText?.trim()) continue;

      // Look for cover image nearby
      const nearbyHtml = html.substring(Math.max(0, match.index - 600), match.index + match[0].length + 200);
      const cover = extractAttr(nearbyHtml, /<img[^>]*src="([^"]+(?:\.jpg|\.png|\.webp)[^"]*)"/i);

      items.push({
        id: slug,
        title: stripTags(decodeEntities(titleText)),
        author: null,
        coverUrl: cover ? this.resolveUrl(cover) : null,
        description: null,
        genres: [],
        status: 'unknown',
        sourceId: this.id,
        url: `${this.baseUrl}/novel/${slug}`,
      });
    }

    const hasNext = html.includes(`/${page + 1}`) || html.includes('class="next"') || html.includes('>Next<');
    return { items, hasNextPage: hasNext, currentPage: page };
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private parseStatus(text: string): NovelInfo['status'] {
    const lower = stripTags(text).toLowerCase();
    if (lower.includes('ongoing') || lower.includes('active')) return 'ongoing';
    if (lower.includes('completed') || lower.includes('complete')) return 'completed';
    if (lower.includes('hiatus')) return 'hiatus';
    return 'unknown';
  }
}
