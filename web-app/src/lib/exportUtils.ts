/**
 * Utility functions for exporting table data to CSV and triggering downloads.
 */

/**
 * Escapes a string for safe inclusion in a CSV field.
 * Handles commas, quotes, and newlines by wrapping in quotes and escaping inner quotes.
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Converts an array of objects to a CSV string.
 * @param headers Array of column headers
 * @param data Array of data objects
 * @param mapRow Function to map a data object to an array of string values matching headers
 */
export function generateCsv<T>(
  headers: string[],
  data: T[],
  mapRow: (row: T) => any[]
): string {
  const headerRow = headers.map(escapeCsv).join(',');
  const dataRows = data.map(item => mapRow(item).map(escapeCsv).join(','));
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a browser download of the provided CSV string.
 * @param csvContent The raw CSV string
 * @param filename The desired filename (e.g., 'report.csv')
 */
export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers a browser print dialog for PDF saving or printing.
 */
export function triggerPrint() {
  window.print();
}
