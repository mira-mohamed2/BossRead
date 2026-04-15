import { File, Paths } from 'expo-file-system';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

/**
 * Full EPUB parser.
 *
 * EPUB files are ZIP archives containing:
 *   META-INF/container.xml → points to content.opf
 *   content.opf            → metadata + manifest + spine
 *   XHTML chapter files    → actual readable content
 *
 * This module extracts metadata and ordered chapter HTML.
 */

export interface EpubMetadata {
  title: string;
  author: string | null;
  language: string;
  publisher: string | null;
  isbn: string | null;
  coverPath: string | null;
}

export interface EpubChapter {
  /** Display title (from ToC or filename fallback) */
  title: string;
  /** Sanitised HTML body content */
  html: string;
}

export interface ParsedEpub {
  metadata: EpubMetadata;
  chapters: EpubChapter[];
}

/**
 * Check if a file at the given path appears to be a valid EPUB.
 */
export async function isValidEpub(filePath: string): Promise<boolean> {
  try {
    const file = new File(filePath);
    if (!file.exists) return false;
    return filePath.toLowerCase().endsWith('.epub');
  } catch {
    return false;
  }
}

/**
 * Read a TXT file and return its content as HTML paragraphs.
 */
export async function readTxtFile(filePath: string): Promise<string> {
  const file = new File(filePath);
  const content = await file.text();

  const paragraphs = content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join('\n');

  return paragraphs;
}

/**
 * Parse an EPUB file and extract metadata + ordered chapter HTML.
 */
export async function parseEpub(filePath: string): Promise<ParsedEpub> {
  const file = new File(filePath);
  const arrayBuffer = await file.bytes();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Locate content.opf via container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'text/xml');
  const rootfileEl = containerDoc.getElementsByTagName('rootfile')[0];
  const opfPath = rootfileEl?.getAttribute('full-path');
  if (!opfPath) throw new Error('Invalid EPUB: no rootfile path');

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Parse content.opf
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error('Invalid EPUB: missing content.opf');

  const opfDoc = parser.parseFromString(opfXml, 'text/xml');

  // 3. Extract metadata
  const metadata = extractMetadata(opfDoc as any);

  // 4. Build manifest map (id → href)
  const manifestMap = new Map<string, string>();
  const manifestItems = opfDoc.getElementsByTagName('item');
  for (let i = 0; i < manifestItems.length; i++) {
    const item = manifestItems[i];
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifestMap.set(id, href);
  }

  // 5. Read spine order → list of chapter hrefs
  const spineItems = opfDoc.getElementsByTagName('itemref');
  const chapterHrefs: string[] = [];
  for (let i = 0; i < spineItems.length; i++) {
    const idref = spineItems[i].getAttribute('idref');
    if (idref && manifestMap.has(idref)) {
      chapterHrefs.push(manifestMap.get(idref)!);
    }
  }

  // 6. Extract chapter HTML in spine order
  const chapters: EpubChapter[] = [];
  for (const href of chapterHrefs) {
    const fullPath = resolveEpubPath(opfDir, href);
    // Try exact path first, then decoded, then case-insensitive search
    let chapterFile = zip.file(fullPath)
      ?? zip.file(decodeURIComponent(fullPath));
    if (!chapterFile) {
      // Case-insensitive fallback — some EPUBs have mismatched casing
      const lowerPath = fullPath.toLowerCase();
      chapterFile = zip.file(new RegExp('^' + lowerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'))[0] ?? null;
    }
    if (!chapterFile) continue;

    const xhtml = await chapterFile.async('text');
    const chapterDoc = parser.parseFromString(xhtml, 'application/xhtml+xml');
    const body = chapterDoc.getElementsByTagName('body')[0];
    if (!body) continue;

    // Use first heading as title, fall back to filename
    const heading = body.getElementsByTagName('h1')[0]
      ?? body.getElementsByTagName('h2')[0]
      ?? body.getElementsByTagName('h3')[0];

    const title = heading?.textContent?.trim()
      || decodeURIComponent(href.replace(/.*\//, '').replace(/\.\w+$/, ''));

    chapters.push({
      title,
      html: getInnerXml(body as any),
    });
  }

  return { metadata, chapters };
}

// --------------- helpers ---------------

/** Resolve a potentially relative EPUB path (handles ../ segments) */
function resolveEpubPath(base: string, href: string): string {
  if (!href.includes('../')) return base + href;
  const parts = (base + href).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      resolved.pop();
    } else if (part !== '.' && part !== '') {
      resolved.push(part);
    }
  }
  return resolved.join('/');
}

function extractMetadata(opfDoc: Document): EpubMetadata {
  const getText = (tagName: string): string | null => {
    // Dublin Core tags may be prefixed (dc:title) or unprefixed
    for (const tag of [tagName, `dc:${tagName}`]) {
      const els = opfDoc.getElementsByTagName(tag);
      if (els.length > 0) return els[0].textContent?.trim() || null;
    }
    return null;
  };

  return {
    title: getText('title') ?? 'Untitled',
    author: getText('creator'),
    language: getText('language') ?? 'en',
    publisher: getText('publisher'),
    isbn: getText('identifier'),
    coverPath: null, // cover extraction deferred to consumer
  };
}

/** Serialise a node's children back to an XML/HTML string. */
function getInnerXml(node: Node): string {
  let result = '';
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === 3) {        // TEXT_NODE
      result += escapeHtml(child.nodeValue ?? '');
    } else if (child.nodeType === 1) { // ELEMENT_NODE
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      const attrs = serializeAttributes(el);
      if (el.childNodes.length === 0) {
        result += `<${tag}${attrs} />`;
      } else {
        result += `<${tag}${attrs}>${getInnerXml(el)}</${tag}>`;
      }
    }
  }
  return result;
}

function serializeAttributes(el: Element): string {
  let s = '';
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    s += ` ${attr.name}="${escapeHtml(attr.value)}"`;
  }
  return s;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
