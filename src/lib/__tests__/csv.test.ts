import { describe, it, expect } from 'vitest';
import {
  detectDelimiter,
  parseDelimitedRows,
  inferFieldType,
  exportTableToDelimited,
} from '../csv';
import { Table } from '../../types/database';

describe('CSV / Delimited Engine', () => {
  it('correctly detects comma, tab, semicolon, and pipe delimiters', () => {
    expect(detectDelimiter('name,age,city\nAlice,30,London')).toBe(',');
    expect(detectDelimiter('name\tage\tcity\nAlice\t30\tLondon')).toBe('\t');
    expect(detectDelimiter('name;age;city\nAlice;30;London')).toBe(';');
    expect(detectDelimiter('name|age|city\nAlice|30|London')).toBe('|');
  });

  it('handles quotes, commas inside quotes, and escaped quotes according to RFC 4180', () => {
    const csv = 'Name,Bio,Role\n"Alice","Software, and data engineer","Admin"\n"Bob","Says ""Hello!""","User"';
    const parsed = parseDelimitedRows(csv, ',');

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual(['Name', 'Bio', 'Role']);
    expect(parsed[1]).toEqual(['Alice', 'Software, and data engineer', 'Admin']);
    expect(parsed[2]).toEqual(['Bob', 'Says "Hello!"', 'User']);
  });

  it('correctly infers column types', () => {
    expect(inferFieldType(['10', '25.5', '100'])).toBe('number');
    expect(inferFieldType(['true', 'false', 'true'])).toBe('checkbox');
    expect(inferFieldType(['2026-10-12', '2026-05-01'])).toBe('date');
    expect(inferFieldType(['https://github.com', 'https://nextjs.org'])).toBe('url');
    expect(inferFieldType(['Random text', '123 street'])).toBe('text');
  });

  it('exports a table to valid escaped CSV', () => {
    const table: Table = {
      id: 't1',
      name: 'Inventory',
      fields: [
        { id: 'f1', name: 'Item', type: 'text' },
        { id: 'f2', name: 'Price', type: 'number' },
      ],
      rows: [
        { id: 'r1', f1: 'Widget, Deluxe', f2: 45 },
        { id: 'r2', f1: 'Gadget', f2: 12 },
      ],
    };

    const exported = exportTableToDelimited(table, ',');
    expect(exported).toContain('Item,Price');
    expect(exported).toContain('"Widget, Deluxe",45');
    expect(exported).toContain('Gadget,12');
  });
});
