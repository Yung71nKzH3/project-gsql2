'use client';

import React, { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import {
  detectDelimiter,
  parseDelimitedRows,
  inferFieldType,
  exportTableToDelimited,
} from '../lib/csv';
import { Table, Field, RecordRow } from '../types/database';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  FileCode,
  ArrowRight,
} from 'lucide-react';

interface DataExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'import' | 'export';
}

export function DataExchangeModal({
  isOpen,
  onClose,
  defaultTab = 'export',
}: DataExchangeModalProps) {
  const { state, activeTable, addTable, addRow, importState, exportStateJson } = useDatabase();

  const [activeTab, setActiveTab] = useState<'import' | 'export'>(defaultTab);

  // Export State
  const [exportFormat, setExportFormat] = useState<'csv' | 'tsv' | 'json'>('csv');
  const [copied, setCopied] = useState(false);

  // Import State
  const [rawInputText, setRawInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [delimiterMode, setDelimiterMode] = useState<'auto' | ',' | ';' | '\t' | '|'>('auto');
  const [hasHeaders, setHasHeaders] = useState(true);
  const [importDestination, setImportDestination] = useState<'new_table' | 'append'>('new_table');
  const [newTableName, setNewTableName] = useState('');

  // Auto-detected delimiter
  const detectedDelim = useMemo(() => {
    return detectDelimiter(rawInputText);
  }, [rawInputText]);

  const effectiveDelimiter = delimiterMode === 'auto' ? detectedDelim : delimiterMode;

  // Parsed Preview
  const parsedRows = useMemo(() => {
    if (!rawInputText.trim()) return [];
    return parseDelimitedRows(rawInputText, effectiveDelimiter);
  }, [rawInputText, effectiveDelimiter]);

  const previewHeaders = useMemo(() => {
    if (parsedRows.length === 0) return [];
    if (hasHeaders) {
      return parsedRows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
    }
    return parsedRows[0].map((_, i) => `Column ${i + 1}`);
  }, [parsedRows, hasHeaders]);

  const previewDataRows = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return hasHeaders ? parsedRows.slice(1) : parsedRows;
  }, [parsedRows, hasHeaders]);

  if (!isOpen) return null;

  // Export handlers
  const handleExportDownload = () => {
    if (exportFormat === 'json') {
      exportStateJson();
      onClose();
      return;
    }

    const delimiter = exportFormat === 'tsv' ? '\t' : ',';
    const csvContent = exportTableToDelimited(activeTable, delimiter);
    const blob = new Blob([csvContent], {
      type: exportFormat === 'tsv' ? 'text/tab-separated-values;charset=utf-8;' : 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTable.name.toLowerCase().replace(/\s+/g, '_')}.${exportFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportCopy = async () => {
    let content = '';
    if (exportFormat === 'json') {
      content = JSON.stringify(state, null, 2);
    } else {
      const delimiter = exportFormat === 'tsv' ? '\t' : ',';
      content = exportTableToDelimited(activeTable, delimiter);
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy export:', e);
    }
  };

  // Import file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setNewTableName(baseName);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.version && Array.isArray(parsed.tables)) {
            importState(parsed);
            onClose();
            return;
          }
        } catch {
          alert('Could not parse JSON workspace.');
        }
      }
      setRawInputText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Perform Import
  const handleCommitImport = () => {
    if (previewDataRows.length === 0) return;

    if (importDestination === 'new_table') {
      const tableName = newTableName.trim() || 'Imported Table';

      // Infer column types
      const fields: Field[] = previewHeaders.map((name, colIdx) => {
        const colValues = previewDataRows.map((r) => r[colIdx] || '');
        const inferredType = inferFieldType(colValues);
        return {
          id: `f_${Date.now()}_${colIdx}`,
          name,
          type: inferredType,
        };
      });

      // Construct rows
      const rows: RecordRow[] = previewDataRows.map((dataRow, rowIdx) => {
        const rowObj: RecordRow = {
          id: `r_${Date.now()}_${rowIdx}`,
        };
        fields.forEach((f, colIdx) => {
          const rawVal = dataRow[colIdx] || '';
          if (f.type === 'number') {
            rowObj[f.id] = rawVal === '' || isNaN(Number(rawVal)) ? null : Number(rawVal);
          } else if (f.type === 'checkbox') {
            rowObj[f.id] = ['true', 'yes', '1'].includes(rawVal.toLowerCase());
          } else {
            rowObj[f.id] = rawVal;
          }
        });
        return rowObj;
      });

      addTable(tableName);
      // Wait next tick or inject into state
      setTimeout(() => {
        // Table created with default view
      }, 0);

      // We can directly add rows to the new table
      // To make it instant, let's create table structure
      const newTableId = `t_${Date.now()}`;
      const newTbl: Table = {
        id: newTableId,
        name: tableName,
        fields,
        rows,
      };

      // Import as state update
      importState({
        ...state,
        tables: [...state.tables, newTbl],
        views: [
          ...state.views,
          {
            id: `v_${Date.now()}`,
            tableId: newTableId,
            name: `${tableName} Grid`,
            type: 'table',
          },
        ],
        activeViewId: `v_${Date.now()}`,
      });
    } else {
      // Append to active table
      previewDataRows.forEach((dataRow) => {
        const initialVals: RecordRow = { id: '' };
        activeTable.fields.forEach((f, idx) => {
          if (idx < dataRow.length) {
            const raw = dataRow[idx];
            if (f.type === 'number') {
              initialVals[f.id] = raw === '' || isNaN(Number(raw)) ? null : Number(raw);
            } else if (f.type === 'checkbox') {
              initialVals[f.id] = ['true', 'yes', '1'].includes(raw.toLowerCase());
            } else {
              initialVals[f.id] = raw;
            }
          }
        });
        addRow(activeTable.id, initialVals);
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 shadow-2xl p-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-black dark:text-white" />
            <h3 className="text-sm font-bold font-mono tracking-wide uppercase">
              Data Exchange & Portability
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-mono border-b-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-black dark:border-white font-bold text-black dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT / DOWNLOAD</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-mono border-b-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-black dark:border-white font-bold text-black dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>IMPORT / UPLOAD</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {activeTab === 'export' ? (
            /* EXPORT TAB */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-500 mb-1">
                  Export Scope
                </label>
                <div className="p-3 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono flex items-center justify-between">
                  <span>Current Table: <strong>{activeTable.name}</strong></span>
                  <span className="text-neutral-400">{activeTable.rows.length} records • {activeTable.fields.length} columns</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-500 mb-1.5">
                  Output Format
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>CSV (.csv)</span>
                    </div>
                    <div className="text-[10px] opacity-75 mt-1">Comma-separated values for Excel & Sheets</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('tsv')}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      exportFormat === 'tsv'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <FileText className="w-4 h-4" />
                      <span>TSV (.tsv)</span>
                    </div>
                    <div className="text-[10px] opacity-75 mt-1">Tab-separated values for data tools</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      exportFormat === 'json'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <FileCode className="w-4 h-4" />
                      <span>Full JSON</span>
                    </div>
                    <div className="text-[10px] opacity-75 mt-1">Entire workspace backup & state snapshot</div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleExportCopy}
                  className="flex items-center space-x-1.5 px-3 py-2 text-xs font-mono border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY RAW TEXT'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDownload}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-mono border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD {exportFormat.toUpperCase()}</span>
                </button>
              </div>
            </div>
          ) : (
            /* IMPORT TAB */
            <div className="space-y-4">
              {/* File upload or text paste */}
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-500 mb-1">
                  Upload CSV, TSV, or JSON File
                </label>
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-center hover:border-black dark:hover:border-white transition-colors bg-neutral-50/50 dark:bg-neutral-900/50">
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="exchange-file-upload"
                  />
                  <label
                    htmlFor="exchange-file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                  >
                    <Upload className="w-5 h-5 text-neutral-400" />
                    <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300">
                      {fileName ? `Selected: ${fileName}` : 'Click to select file or drag and drop'}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Accepts standard RFC-4180 CSV, TSV, or UrlBase JSON snapshots
                    </span>
                  </label>
                </div>
              </div>

              {/* Paste Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono uppercase text-neutral-500">
                    Or Paste Raw Delimited Text
                  </label>
                  {rawInputText && (
                    <button
                      onClick={() => setRawInputText('')}
                      className="text-[10px] font-mono text-neutral-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={rawInputText}
                  onChange={(e) => setRawInputText(e.target.value)}
                  placeholder="Paste rows copied from Excel, Sheets, or CSV file here..."
                  rows={4}
                  className="w-full text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 p-2.5 outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              {/* Settings: Delimiter & Headers */}
              {rawInputText && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 mb-1">
                      Delimiter
                    </label>
                    <select
                      value={delimiterMode}
                      onChange={(e) => setDelimiterMode(e.target.value as typeof delimiterMode)}
                      className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-2 py-1 outline-none text-xs"
                    >
                      <option value="auto">
                        Auto-detect (Detected: {detectedDelim === '\t' ? 'Tab' : detectedDelim})
                      </option>
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value={'\t'}>Tab (\t)</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 mb-1">
                      Headers
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer mt-1.5">
                      <input
                        type="checkbox"
                        checked={hasHeaders}
                        onChange={(e) => setHasHeaders(e.target.checked)}
                        className="w-3.5 h-3.5 rounded-none accent-black dark:accent-white"
                      />
                      <span>First row has column names</span>
                    </label>
                  </div>

                  {/* Destination */}
                  <div className="col-span-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <label className="block text-[10px] uppercase text-neutral-400 mb-1">
                      Target Destination
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="import_dest"
                          checked={importDestination === 'new_table'}
                          onChange={() => setImportDestination('new_table')}
                          className="accent-black dark:accent-white"
                        />
                        <span>Create as New Table</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="import_dest"
                          checked={importDestination === 'append'}
                          onChange={() => setImportDestination('append')}
                          className="accent-black dark:accent-white"
                        />
                        <span>Append to &ldquo;{activeTable.name}&rdquo;</span>
                      </label>
                    </div>

                    {importDestination === 'new_table' && (
                      <input
                        type="text"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        placeholder="Table name (e.g. Imported Sheet)..."
                        className="mt-2 w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs outline-none"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Live Preview Grid */}
              {previewDataRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-neutral-400 uppercase">
                      Live Data Preview ({previewDataRows.length} records parsed)
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Showing first 5 rows
                    </span>
                  </div>
                  <div className="border border-neutral-200 dark:border-neutral-800 overflow-x-auto max-h-36">
                    <table className="w-full border-collapse text-left text-[11px] font-mono">
                      <thead className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0">
                        <tr>
                          {previewHeaders.map((h, i) => (
                            <th key={i} className="px-2.5 py-1.5 border-r border-neutral-200 dark:border-neutral-800 font-semibold truncate max-w-[140px]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:border-neutral-800">
                        {previewDataRows.slice(0, 5).map((r, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-neutral-50 dark:hover:bg-neutral-950">
                            {previewHeaders.map((_, colIdx) => (
                              <td key={colIdx} className="px-2.5 py-1 border-r border-neutral-200 dark:border-neutral-800 truncate max-w-[140px]">
                                {r[colIdx] || <span className="text-neutral-300 dark:text-neutral-700">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Commit Button */}
              {previewDataRows.length > 0 && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCommitImport}
                    className="flex items-center space-x-1.5 px-4 py-2 text-xs font-mono border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
                  >
                    <span>IMPORT {previewDataRows.length} RECORDS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
