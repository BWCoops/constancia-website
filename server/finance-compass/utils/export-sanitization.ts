/**
 * Export Sanitization Utility
 * 
 * Prevents formula injection attacks in CSV and Excel exports by sanitizing
 * values that could be interpreted as formulas by spreadsheet applications.
 * 
 * Formulas start with: =, +, -, @, or tab/carriage return followed by these
 * Countermeasure: Prefix dangerous values with a single quote (')
 */

/**
 * Sanitizes a single value for safe export to CSV/Excel
 * 
 * Detects and neutralizes potential formula injection by:
 * 1. Converting value to string
 * 2. Checking if it starts with formula injection characters
 * 3. Prefixing dangerous values with single quote
 * 4. Handling null/undefined safely
 * 
 * @param value - The value to sanitize
 * @returns Sanitized string safe for export
 */
export function sanitizeForExport(value: any): string {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return "";
  }

  // Convert to string
  let stringValue = String(value);

  // Check for formula injection patterns
  // Formulas in Excel start with: =, +, -, @
  // Also check for tab or carriage return followed by these
  const formulaPattern = /^[\t\r]?[=+\-@]/;

  if (formulaPattern.test(stringValue)) {
    // Prefix with single quote to prevent formula execution
    return "'" + stringValue;
  }

  return stringValue;
}

/**
 * Sanitizes all string values in an object for safe export
 * 
 * Recursively processes an object and applies sanitization to:
 * - Direct string values
 * - Nested objects
 * - Arrays of primitives or objects
 * 
 * @param obj - The object to sanitize
 * @returns New object with all string values sanitized
 */
export function sanitizeObjectForExport<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive values
  if (typeof obj !== "object") {
    if (typeof obj === "string") {
      return sanitizeForExport(obj) as T;
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === "object" && item !== null) {
        return sanitizeObjectForExport(item);
      } else if (typeof item === "string") {
        return sanitizeForExport(item);
      }
      return item;
    }) as T;
  }

  // Handle objects
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObjectForExport(value);
    } else if (typeof value === "string") {
      sanitized[key] = sanitizeForExport(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Sanitizes an array of objects for CSV/Excel export
 * 
 * Useful for batch sanitizing rows of data
 * 
 * @param rows - Array of objects to sanitize
 * @returns Array with all string values sanitized
 */
export function sanitizeRowsForExport<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => sanitizeObjectForExport(row));
}

/**
 * Sanitizes a CSV field value with proper quoting
 * 
 * Handles CSV-specific requirements:
 * - Escapes quotes
 * - Wraps in quotes if contains comma, quote, or newline
 * - Prevents formula injection
 * 
 * @param value - The value to sanitize for CSV
 * @returns CSV-safe string
 */
export function sanitizeForCSV(value: any): string {
  const sanitized = sanitizeForExport(value);
  
  // Check if value needs quoting (contains comma, quote, newline, or starts with quote)
  if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n") || sanitized.startsWith("'")) {
    // Escape quotes by doubling them
    const escaped = sanitized.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return sanitized;
}
