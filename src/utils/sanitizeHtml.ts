/**
 * Lightweight sanitizer for untrusted article HTML.
 * This is intentionally conservative and strips executable/unsafe elements.
 */
export function sanitizeHtml(input: string): string {
  let html = input;

  // Remove high-risk elements entirely.
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<base[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '');

  // Remove inline event handlers like onclick=... or onload='...'.
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Neutralize javascript: and data: URLs in href/src attributes.
  html = html.replace(/\s(href|src)\s*=\s*("|')\s*(javascript:|data:)[\s\S]*?\2/gi, '');
  html = html.replace(/\s(href|src)\s*=\s*([^\s>]+)(?=[\s>])/gi, (match, attr, value) => {
    const raw = String(value).trim().toLowerCase();
    if (raw.startsWith('javascript:') || raw.startsWith('data:')) {
      return '';
    }
    return match;
  });

  return html;
}