/**
 * HTML Sanitizer Service
 *
 * Provides XSS prevention utilities for user-supplied content.
 * All functions are pure — no side effects, no external dependencies.
 */

// ============================================================
// Dangerous pattern sets
// ============================================================

const DANGEROUS_TAGS_RE =
  /<(script|style|iframe|object|embed|applet|base|link|meta|form|input|button|select|textarea|noscript|noembed|noframes|plaintext|xmp)[\s\S]*?>/gi;

const SELF_CLOSING_DANGEROUS_RE =
  /<\/?(script|style|iframe|object|embed|applet|base|form|noscript|noembed|noframes)>/gi;

const EVENT_HANDLER_RE = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;

const JAVASCRIPT_HREF_RE = /\bhref\s*=\s*["']?\s*javascript\s*:/gi;
const JAVASCRIPT_URI_RE = /\bjavascript\s*:/gi;
const VBSCRIPT_URI_RE = /\bvbscript\s*:/gi;
const DATA_URI_RE = /\bdata\s*:/gi;
const DATA_HTML_URI_RE = /\bdata\s*:\s*text\/html/gi;

const OBJECT_TAG_RE = /<\/?object[\s\S]*?>/gi;
const EMBED_TAG_RE = /<\/?embed[\s\S]*?>/gi;
const FORM_TAG_RE = /<\/?form[\s\S]*?>/gi;
const BUTTON_TAG_RE = /<\/?button[\s\S]*?>/gi;
const INPUT_TAG_RE = /<input[^>]*>/gi;
const IFRAME_TAG_RE = /<\/?iframe[\s\S]*?>/gi;
const SVG_TAG_RE = /<\/?svg[\s\S]*?>/gi;
const MATH_TAG_RE = /<\/?math[\s\S]*?>/gi;
const LINK_TAG_RE = /<\/?link[\s\S]*?>/gi;
const META_TAG_RE = /<\/?meta[\s\S]*?>/gi;
const STYLE_ATTR_RE = /\bstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;

export interface SanitizeOptions {
  allowImages?: boolean;
  allowLinks?: boolean;
  allowTables?: boolean;
  stripAllHtml?: boolean;
}

// ============================================================
// Core: sanitizeHtml
// ============================================================

/**
 * Remove dangerous HTML while optionally preserving safe elements.
 */
export function sanitizeHtml(html: string | null | undefined, options: SanitizeOptions = {}): string {
  if (html == null) return '';
  let out = String(html);

  if (options.stripAllHtml) {
    return removeHtmlTags(out);
  }

  // Strip completely dangerous tags (and their contents for script/style)
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(IFRAME_TAG_RE, '');
  out = out.replace(OBJECT_TAG_RE, '');
  out = out.replace(EMBED_TAG_RE, '');
  out = out.replace(FORM_TAG_RE, '');
  out = out.replace(BUTTON_TAG_RE, '');
  out = out.replace(INPUT_TAG_RE, '');
  out = out.replace(SVG_TAG_RE, '');
  out = out.replace(MATH_TAG_RE, '');
  out = out.replace(LINK_TAG_RE, '');
  out = out.replace(META_TAG_RE, '');

  // Strip remaining <script ...> open/close tags
  out = out.replace(SELF_CLOSING_DANGEROUS_RE, '');

  // Strip event handlers from any remaining tags
  out = out.replace(EVENT_HANDLER_RE, '');

  // Strip style attributes (can carry expression() / url(javascript:) vectors)
  out = out.replace(STYLE_ATTR_RE, '');

  // Strip dangerous URI schemes
  out = out.replace(JAVASCRIPT_URI_RE, 'removed:');
  out = out.replace(VBSCRIPT_URI_RE, 'removed:');
  out = out.replace(DATA_URI_RE, 'removed:');

  return out;
}

// ============================================================
// sanitizeBlogContent
// ============================================================

/**
 * Sanitize blog/rich-text content.
 * Allows a safe subset of structural HTML tags but strips scripts and events.
 */
export function sanitizeBlogContent(content: string | null | undefined): string {
  if (content == null) return '';
  return sanitizeHtml(content, { allowImages: true, allowLinks: true, allowTables: true });
}

// ============================================================
// sanitizeUserInput
// ============================================================

/**
 * Sanitize short user-supplied text (names, form fields, etc.).
 * Strips all HTML tags.
 */
export function sanitizeUserInput(input: string | null | undefined): string {
  if (input == null) return '';
  return removeHtmlTags(String(input)).trim();
}

// ============================================================
// sanitizeMarkdown
// ============================================================

/**
 * Remove XSS vectors from Markdown source while preserving legitimate markup.
 */
export function sanitizeMarkdown(markdown: string | null | undefined): string {
  if (markdown == null) return '';
  let out = String(markdown);

  // Remove script tags embedded in markdown
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<script[^>]*>/gi, '');
  out = out.replace(/<\/script>/gi, '');

  // Remove event handlers from inline HTML
  out = out.replace(EVENT_HANDLER_RE, '');

  // Neutralise dangerous URI schemes in markdown links/images: [text](javascript:...)
  out = out.replace(/(\]\()(\s*javascript\s*:)/gi, '$1removed:');
  out = out.replace(/(\]\()(\s*vbscript\s*:)/gi, '$1removed:');
  out = out.replace(/(\]\()(\s*data\s*:)/gi, '$1removed:');

  // Neutralise dangerous URIs in HTML attributes within markdown
  out = out.replace(JAVASCRIPT_URI_RE, 'removed:');
  out = out.replace(VBSCRIPT_URI_RE, 'removed:');
  out = out.replace(DATA_URI_RE, 'removed:');

  return out;
}

// ============================================================
// escapeHtml
// ============================================================

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

/**
 * Escape special HTML characters to their entity equivalents.
 * Safe to use inside HTML attribute values and text nodes.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  return String(text).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

// ============================================================
// validateNoHtml
// ============================================================

const ANY_TAG_RE = /<[a-zA-Z/][^>]*>/;

/**
 * Returns true if the string contains no HTML tags; false otherwise.
 */
export function validateNoHtml(text: string | null | undefined): boolean {
  if (text == null) return true;
  return !ANY_TAG_RE.test(String(text));
}

// ============================================================
// removeHtmlTags
// ============================================================

/**
 * Strip every HTML tag from a string, returning plain text only.
 * Also collapses excess whitespace introduced by removed tags.
 */
export function removeHtmlTags(html: string | null | undefined): string {
  if (html == null) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
