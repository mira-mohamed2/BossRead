import type { NovelSource, NovelInfo, ChapterInfo, ChapterContent, SourcePage } from './types';
import { fetchHtml, extractText, extractAll, extractAttr, stripTags, cleanChapterHtml, decodeEntities } from './scraper';

/**
 * NovelBin.me source — large English translated novel library.
 * Novel pages live on novelbin.me, chapter reading redirects to novelbin.com.
 */
export class NovelBinSource implements NovelSource {
  id = 'novelbin';
  name = 'NovelBin';
  baseUrl = 'https://novelbin.me';
  /** Chapter reading happens on the .com sibling domain */
  private readUrl = 'https://novelbin.com';
  language = 'en';
  iconUrl = 'https://novelbin.me/favicon.ico';
  supportsSearch = true;
  genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Eastern', 'Fantasy',
    'Harem', 'Historical', 'Horror', 'Isekai', 'Martial Arts', 'Mature',
    'Mystery', 'Psychological', 'Reincarnation', 'Romance', 'Sci-fi',
    'Slice of Life', 'Supernatural', 'Tragedy', 'Wuxia', 'Xianxia', 'Yaoi', 'Yuri',
  ];

  async getPopular(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/sort/novelbin-hot?page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getLatest(page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/sort/novelbin-daily-update?page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async search(query: string, page: number): Promise<SourcePage<NovelInfo>> {
    const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHtml(url);
    return this.parseListPage(html, page);
  }

  async getNovelDetails(novelId: string): Promise<NovelInfo> {
    const url = `${this.baseUrl}/novel-book/${novelId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h3[^>]*>\s*([\s\S]*?)\s*<\/h3>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;
    const author = extractText(html, /Author[^<]*<\/(?:h3|span|div)>\s*(?:<[^>]*>)*\s*<a[^>]*>([\s\S]*?)<\/a>/i);
    const coverUrl = extractAttr(html, /<img[^>]*src="(https:\/\/images\.novelbin[^"]+)"/i)
      ?? extractAttr(html, /<div[^>]*class="[^"]*book[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i);
    const description = extractText(html, /Description[\s\S]*?<\/(?:h3|div)>\s*([\s\S]*?)(?:<\/div>|Novel\s*Bin)/i);
    const genreMatches = extractAll(html, /<a[^>]*href="[^"]*novelbin-genres[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
    const statusText = extractText(html, /Status[^<]*<\/(?:h3|span)>\s*(?:<[^>]*>)*\s*<a[^>]*>([\s\S]*?)<\/a>/i) ?? '';

    return {
      id: novelId,
      title: stripTags(title),
      author: author ? stripTags(author) : null,
      coverUrl: coverUrl ?? `https://images.novelbin.me/novel/${novelId}.jpg`,
      description: description ? stripTags(description).substring(0, 500) : null,
      genres: genreMatches.map(stripTags),
      status: this.parseStatus(statusText),
      sourceId: this.id,
      url,
    };
  }

  async getChapterList(novelId: string): Promise<ChapterInfo[]> {
    // NovelBin loads chapters via AJAX — try the /novel-book/ page first
    const url = `${this.baseUrl}/novel-book/${novelId}`;
    const html = await fetchHtml(url);

    const chapters: ChapterInfo[] = [];
    // Match chapter links: /novel-book/{slug}/{chapter-slug}
    const chapterPattern = new RegExp(
      `<a[^>]*href="[^"]*(?:/novel-book/${this.escapeRegex(novelId)}/|/b/${this.escapeRegex(novelId)}/)([^"]+)"[^>]*>\\s*([\\s\\S]*?)\\s*</a>`,
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
        url: `${this.readUrl}/b/${novelId}/${slug}`,
      });
      index++;
    }

    return chapters;
  }

  async getChapterContent(novelId: string, chapterId: string): Promise<ChapterContent> {
    // Reading happens on novelbin.com/b/{slug}/{chapter-slug}
    const url = `${this.readUrl}/b/${novelId}/${chapterId}`;
    const html = await fetchHtml(url);

    const title = extractText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i)
      ?? extractText(html, /class="[^"]*chr-title[^"]*"[^>]*>([\s\S]*?)</i) ?? chapterId;
    const content = extractText(html, /<div[^>]*id="chr-content"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*class="[^"]*chr-c[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      ?? extractText(html, /<div[^>]*id="chapter-content"[^>]*>([\s\S]*?)<\/div>/i) ?? '';
    const novelTitle = extractText(html, /<a[^>]*class="[^"]*novel-title[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      ?? extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? novelId;

    const prevMatch = extractAttr(html, /[Pp]rev\s*[Cc]hapter[^>]*href="[^"]*\/([^/"]+)"/i)
      ?? extractAttr(html, /id="prev_chap"[^>]*href="[^"]*\/([^/"]+)"/i);
    const nextMatch = extractAttr(html, /[Nn]ext\s*[Cc]hapter[^>]*href="[^"]*\/([^/"]+)"/i)
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

    // Match novel links: <h3><a href="/novel-book/{slug}">Title</a></h3>
    const novelPattern = /<h3[^>]*>\s*<a[^>]*href="\/novel-book\/([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/gi;
    let match: RegExpExecArray | null;

    while ((match = novelPattern.exec(html)) !== null) {
      const slug = match[1].replace(/\/$/, '');
      const titleText = match[2];
      if (!titleText?.trim()) continue;

      // Cover is img.novelbin.me
      const cover = `https://images.novelbin.me/novel/${slug}.jpg`;

      items.push({
        id: slug,
        title: stripTags(decodeEntities(titleText)),
        author: null,
        coverUrl: cover,
        description: null,
        genres: [],
        status: 'unknown',
        sourceId: this.id,
        url: `${this.baseUrl}/novel-book/${slug}`,
      });
    }

    const hasNext = html.includes(`page=${page + 1}`) || html.includes('class="next"') || html.includes('>Next<');
    return { items, hasNextPage: hasNext, currentPage: page };
  }

  private parseStatus(text: string): NovelInfo['status'] {
    const lower = stripTags(text).toLowerCase();
    if (lower.includes('ongoing') || lower.includes('active')) return 'ongoing';
    if (lower.includes('completed') || lower.includes('complete') || lower.includes('finished')) return 'completed';
    if (lower.includes('hiatus')) return 'hiatus';
    return 'unknown';
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
