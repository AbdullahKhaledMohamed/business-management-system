/**
 * Converts an array of flat objects into a CSV string.
 * Escapes commas, quotes, and newlines per RFC 4180.
 */
export function toCsv(rows, columns) {
  const escapeCell = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','))
    .join('\n');

  // Prepend a UTF-8 BOM so Excel renders Arabic text correctly.
  return `\uFEFF${header}\n${body}`;
}
