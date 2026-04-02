/**
 * Unified position within any content type.
 * Only relevant fields are populated per format.
 */
export interface ContentPosition {
  /** EPUB: canonical fragment identifier */
  epubCfi?: string;
  /** PDF: current page number (0-based) */
  page?: number;
  /** PDF: vertical scroll offset within page (0-1) */
  yOffset?: number;
  /** Article/TXT: character offset from start */
  charOffset?: number;
  /** Chapter/section index within content */
  chapterIndex?: number;
  /** Paragraph index within chapter (for TTS) */
  paragraphIndex?: number;
  /** Sentence index within paragraph (for TTS) */
  sentenceIndex?: number;
}
