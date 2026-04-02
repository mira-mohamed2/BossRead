import { TTSChunk } from '../../../types';

/**
 * Splits text into sentence-level chunks for TTS.
 * Uses simple sentence-boundary heuristics.
 */
export function chunkText(text: string): TTSChunk[] {
  const chunks: TTSChunk[] = [];
  // Split into paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const paragraph = paragraphs[pIdx].trim();
    // Split into sentences using common sentence-ending punctuation
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);

    let charOffset = text.indexOf(paragraph);

    for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
      const sentence = sentences[sIdx].trim();
      if (sentence.length === 0) continue;

      chunks.push({
        text: sentence,
        paragraphIndex: pIdx,
        sentenceIndex: sIdx,
        charOffset: charOffset >= 0 ? charOffset : 0,
      });

      charOffset += sentence.length + 1; // +1 for space
    }
  }

  return chunks;
}

/**
 * Strips HTML tags to extract plain text for TTS.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
