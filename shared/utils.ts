/**
 * Shared utility functions for use across client and server code.
 * These utilities handle common tasks like formatting and input sanitization.
 */

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param milliseconds - The duration in milliseconds
 * @returns A formatted string in the format "Xh Xm Xs" or "Xm Xs" if under 1 hour
 */
export function formatDuration(milliseconds: number): string {
  // Convert milliseconds to seconds
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  
  // Show cleaner format: skip hours if zero
  if (hours === 0) {
    return `${mins}m ${secs}s`;
  }
  return `${hours}h ${mins}m ${secs}s`;
}

/**
 * Sanitizes user input to prevent XSS attacks.
 * Removes HTML tags and escapes special characters.
 * @param input - The raw user input string
 * @returns A sanitized string safe for display
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
        '&': '&amp;'
      };
      return entities[char] || char;
    })
    .trim()
    .slice(0, 10000);
}

/**
 * Sanitizes a filename to prevent path traversal and ensure safe file operations.
 * Removes dangerous characters and patterns that could be used for attacks.
 * @param filename - The raw filename string
 * @returns A sanitized filename safe for file system operations
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return '';
  
  return filename
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .trim()
    .slice(0, 255);
}
