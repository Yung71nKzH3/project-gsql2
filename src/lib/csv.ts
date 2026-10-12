import { Table, FieldType } from '../types/database';

/**
 * Auto-detects the delimiter by inspecting the first few lines of text.
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return ',';

  const candidates = [',', ';', '\t', '|'];
  const scores: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };

  for (const line of lines) {
    for (const d of candidates) {
      const count = line.split(d).length - 1;
      scores[d] += count;
    }
  }

  let best = ',';
  let maxScore = 0;
  for (const d of candidates) {
    if (scores[d] > maxScore) {
      maxScore = scores[d];
      best = d;
    }
  }

  return best;
}

/**
 * Parses a delimited string (CSV/TSV/DSV) adhering to RFC 4180 escaping rules.
 */
export function parseDelimitedRows(text: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentField += '"';
          i++; // skip next quote
        } else {
          // End of quoted field
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out any trailing empty row
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/**
 * Inactive type inference on a column of values.
 */
export function inferFieldType(sampleValues: string[]): FieldType {
  const clean = sampleValues.map((v) => v.trim()).filter((v) => v.length > 0);
  if (clean.length === 0) return 'text';

  // Checkbox boolean
  const isAllBool = clean.every((v) => ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase()));
  if (isAllBool) return 'checkbox';

  // Number
  const isAllNumber = clean.every((v) => !isNaN(Number(v)) && !isNaN(parseFloat(v)));
  if (isAllNumber) return 'number';

  // Date (YYYY-MM-DD or MM/DD/YYYY)
  const isAllDate = clean.every((v) => {
    const d = Date.parse(v);
    return !isNaN(d) && (v.includes('-') || v.includes('/')) && v.length >= 8 && v.length <= 12;
  });
  if (isAllDate) return 'date';

  // URL
  const isAllUrl = clean.every((v) => v.startsWith('http://') || v.startsWith('https://'));
  if (isAllUrl) return 'url';

  return 'text';
}

/**
 * Converts a raw table into an RFC 4180 CSV / TSV string.
 */
export function exportTableToDelimited(table: Table, delimiter: string = ','): string {
  const header = table.fields
    .map((f) => escapeField(f.name, delimiter))
    .join(delimiter);

  const rows = table.rows.map((r) =>
    table.fields
      .map((f) => {
        const val = r[f.id];
        if (val === undefined || val === null) return '';
        if (Array.isArray(val)) return escapeField(val.join('; '), delimiter);
        return escapeField(String(val), delimiter);
      })
      .join(delimiter)
  );

  return [header, ...rows].join('\r\n');
}

function escapeField(str: string, delimiter: string): string {
  if (
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
