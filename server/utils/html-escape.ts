/**
 * Escapes user-controlled strings for safe insertion into HTML contexts.
 * Prevents XSS when building HTML via template literals.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

export function safeNumber(value: unknown): number {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}
