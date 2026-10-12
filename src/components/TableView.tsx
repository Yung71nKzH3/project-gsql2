'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Field, RecordRow } from '../types/database';
import { RelationCell } from './RelationCell';
import { MultiSelectCell } from './MultiSelectCell';
import { FieldConfigModal } from './FieldConfigModal';
import { SafeDeleteModal } from './SafeDeleteModal';
import {
  Plus,
  Trash2,
  Copy,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Type,
  Hash,
  ListFilter,
  CheckSquare,
  Link as LinkIcon,
  Calendar,
  Tags,
  Globe,
  ExternalLink,
  X,
  Sigma,
} from 'lucide-react';

interface TableViewProps {
  filteredRows: RecordRow[];
}

type NumberAggType = 'sum' | 'avg' | 'min' | 'max' | 'count';

export function TableView({ filteredRows }: TableViewProps) {
  const {
    activeTable,
    updateCell,
    deleteRow,
    duplicateRow,
    bulkDeleteRows,
    bulkDuplicateRows,
    addRow,
    reorderFields,
  } = useDatabase();

  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [modalField, setModalField] = useState<Field | undefined>(undefined);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);

  // Row selection & Google Sheets-style range selection
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [lastSelectedRowIdx, setLastSelectedRowIdx] = useState<number | null>(null);

  // Safe delete modal state
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    rowIds: string[];
    title: string;
  }>({ isOpen: false, rowIds: [], title: '' });

  // Column aggregation metrics map: fieldId -> NumberAggType
  const [numberAggregations, setNumberAggregations] = useState<Record<string, NumberAggType>>({});

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const fields = activeTable.fields;

  // Keyboard navigation across cells
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFieldModalOpen || deleteModalConfig.isOpen) return;

      if (editingCell) {
        if (e.key === 'Escape') {
          setEditingCell(null);
        } else if (e.key === 'Enter') {
          setEditingCell(null);
          setSelectedCell((prev) => {
            if (!prev) return null;
            const nextRow = Math.min(filteredRows.length - 1, prev.rowIdx + 1);
            return { ...prev, rowIdx: nextRow };
          });
        }
        return;
      }

      if (!selectedCell) return;

      const { rowIdx, colIdx } = selectedCell;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCell({ rowIdx: Math.max(0, rowIdx - 1), colIdx });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCell({ rowIdx: Math.min(filteredRows.length - 1, rowIdx + 1), colIdx });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCell({ rowIdx, colIdx: Math.max(0, colIdx - 1) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedCell({ rowIdx, colIdx: Math.min(fields.length - 1, colIdx + 1) });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const currentField = fields[colIdx];
        if (
          currentField &&
          currentField.type !== 'checkbox' &&
          currentField.type !== 'relation' &&
          currentField.type !== 'multi_select'
        ) {
          setEditingCell({ rowIdx, colIdx });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, editingCell, filteredRows.length, fields, isFieldModalOpen, deleteModalConfig.isOpen]);

  const getFieldIcon = (type: Field['type']) => {
    switch (type) {
      case 'text':
        return <Type className="w-3 h-3 text-neutral-400" />;
      case 'number':
        return <Hash className="w-3 h-3 text-neutral-400" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-neutral-400" />;
      case 'select':
        return <ListFilter className="w-3 h-3 text-neutral-400" />;
      case 'multi_select':
        return <Tags className="w-3 h-3 text-neutral-400" />;
      case 'checkbox':
        return <CheckSquare className="w-3 h-3 text-neutral-400" />;
      case 'url':
        return <Globe className="w-3 h-3 text-neutral-400" />;
      case 'relation':
        return <LinkIcon className="w-3 h-3 text-neutral-400" />;
    }
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  // Google Sheets-style row selection with Shift + Click support
  const handleRowCheckboxClick = (rowId: string, rowIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedRowIdx !== null) {
      const start = Math.min(lastSelectedRowIdx, rowIdx);
      const end = Math.max(lastSelectedRowIdx, rowIdx);
      const next = new Set(selectedRowIds);
      for (let i = start; i <= end; i++) {
        if (filteredRows[i]) next.add(filteredRows[i].id);
      }
      setSelectedRowIds(next);
    } else {
      const next = new Set(selectedRowIds);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      setSelectedRowIds(next);
      setLastSelectedRowIdx(rowIdx);
    }
  };

  // Select all / Deselect all
  const areAllSelected = filteredRows.length > 0 && selectedRowIds.size === filteredRows.length;
  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  // Bulk actions
  const handleBulkDuplicate = () => {
    bulkDuplicateRows(activeTable.id, Array.from(selectedRowIds));
    setSelectedRowIds(new Set());
  };

  const handleConfirmDelete = () => {
    if (deleteModalConfig.rowIds.length === 1) {
      deleteRow(activeTable.id, deleteModalConfig.rowIds[0]);
    } else if (deleteModalConfig.rowIds.length > 1) {
      bulkDeleteRows(activeTable.id, deleteModalConfig.rowIds);
    }
    setSelectedRowIds(new Set());
  };

  // Aggregation Calculations
  const aggregations = useMemo(() => {
    const results: Record<string, string> = {};

    fields.forEach((f) => {
      const values = filteredRows.map((r) => r[f.id]);

      if (f.type === 'number') {
        const numbers = values
          .filter((v) => typeof v === 'number' && !isNaN(v))
          .map((v) => Number(v));

        const mode = numberAggregations[f.id] || 'sum';
        if (numbers.length === 0) {
          results[f.id] = '—';
          return;
        }

        const sum = numbers.reduce((a, b) => a + b, 0);
        switch (mode) {
          case 'sum':
            results[f.id] = `Sum: ${sum.toLocaleString()}`;
            break;
          case 'avg':
            results[f.id] = `Avg: ${(sum / numbers.length).toFixed(1)}`;
            break;
          case 'min':
            results[f.id] = `Min: ${Math.min(...numbers).toLocaleString()}`;
            break;
          case 'max':
            results[f.id] = `Max: ${Math.max(...numbers).toLocaleString()}`;
            break;
          case 'count':
            results[f.id] = `Count: ${numbers.length}`;
            break;
        }
      } else if (f.type === 'checkbox') {
        const checked = values.filter(Boolean).length;
        const total = values.length;
        const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
        results[f.id] = `${checked}/${total} (${pct}%)`;
      } else {
        const filled = values.filter((v) => v !== null && v !== undefined && v !== '').length;
        results[f.id] = `${filled} filled`;
      }
    });

    return results;
  }, [fields, filteredRows, numberAggregations]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black relative" ref={tableContainerRef}>
      {/* Scrollable table grid */}
      <div className="flex-1 overflow-auto border-b border-neutral-200 dark:border-neutral-800">
        <table className="w-full border-collapse text-xs text-left">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none">
            <tr>
              {/* Row Selection & Number Header */}
              <th className="sticky left-0 z-30 bg-neutral-100 dark:bg-neutral-900 w-12 px-2 py-2 text-center text-neutral-400 font-mono text-[10px] border-r border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-center space-x-1">
                  <input
                    type="checkbox"
                    checked={areAllSelected}
                    onChange={toggleSelectAll}
                    title="Select all records"
                    className="w-3.5 h-3.5 rounded-none accent-black dark:accent-white cursor-pointer"
                  />
                </div>
              </th>

              {fields.map((f, colIdx) => (
                <th
                  key={f.id}
                  className="group relative min-w-[170px] max-w-[260px] px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 truncate">
                      {getFieldIcon(f.type)}
                      <span className="truncate">{f.name}</span>
                    </div>

                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-0.5">
                      {colIdx > 0 && (
                        <button
                          onClick={() => reorderFields(activeTable.id, colIdx, colIdx - 1)}
                          className="p-0.5 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                          title="Move column left"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {colIdx < fields.length - 1 && (
                        <button
                          onClick={() => reorderFields(activeTable.id, colIdx, colIdx + 1)}
                          className="p-0.5 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                          title="Move column right"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setModalField(f);
                          setIsFieldModalOpen(true);
                        }}
                        className="p-0.5 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                        title="Configure column"
                      >
                        <Settings2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}

              {/* Add Column Header */}
              <th className="w-16 px-2 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center">
                <button
                  onClick={() => {
                    setModalField(undefined);
                    setIsFieldModalOpen(true);
                  }}
                  className="p-1 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                  title="Add new column"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>

              {/* Row Action Header */}
              <th className="w-16 px-2 py-2 text-center text-neutral-400 font-mono text-[10px]"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredRows.map((row, rowIdx) => {
              const isRowSelected = selectedRowIds.has(row.id);

              return (
                <tr
                  key={row.id}
                  className={`group transition-colors ${
                    isRowSelected
                      ? 'bg-neutral-100/80 dark:bg-neutral-900/80'
                      : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
                  }`}
                >
                  {/* Sticky Row Index & Selection Checkbox */}
                  <td className="sticky left-0 z-10 w-12 px-2 py-2 text-center font-mono text-[11px] text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-950/90 select-none">
                    <div className="flex items-center justify-center space-x-1">
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onClick={(e) => handleRowCheckboxClick(row.id, rowIdx, e)}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded-none accent-black dark:accent-white cursor-pointer"
                      />
                      <span className="text-[10px] text-neutral-400">{rowIdx + 1}</span>
                    </div>
                  </td>

                  {/* Field Cells */}
                  {fields.map((f, colIdx) => {
                    const val = row[f.id];
                    const isSelected = selectedCell?.rowIdx === rowIdx && selectedCell?.colIdx === colIdx;
                    const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx;

                    return (
                      <td
                        key={f.id}
                        onClick={() => setSelectedCell({ rowIdx, colIdx })}
                        onDoubleClick={() => {
                          setSelectedCell({ rowIdx, colIdx });
                          if (
                            f.type !== 'checkbox' &&
                            f.type !== 'relation' &&
                            f.type !== 'multi_select'
                          ) {
                            setEditingCell({ rowIdx, colIdx });
                          }
                        }}
                        className={`relative min-w-[170px] max-w-[260px] px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 transition-colors ${
                          isSelected
                            ? 'ring-1 ring-black dark:ring-white bg-neutral-100/50 dark:bg-neutral-900/50'
                            : ''
                        }`}
                      >
                        {/* Text Input */}
                        {f.type === 'text' && (
                          isEditing ? (
                            <input
                              type="text"
                              value={val !== undefined && val !== null ? String(val) : ''}
                              onChange={(e) => updateCell(activeTable.id, row.id, f.id, e.target.value, true)}
                              onBlur={handleCellBlur}
                              autoFocus
                              className="w-full bg-white dark:bg-black border border-neutral-400 dark:border-neutral-600 px-1.5 py-0.5 outline-none font-sans"
                            />
                          ) : (
                            <div className="truncate min-h-[18px] cursor-text">
                              {val !== undefined && val !== '' && val !== null ? (
                                String(val)
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-700 italic">—</span>
                              )}
                            </div>
                          )
                        )}

                        {/* Number Input */}
                        {f.type === 'number' && (
                          isEditing ? (
                            <input
                              type="number"
                              value={val !== undefined && val !== null ? String(val) : ''}
                              onChange={(e) =>
                                updateCell(
                                  activeTable.id,
                                  row.id,
                                  f.id,
                                  e.target.value === '' ? null : Number(e.target.value),
                                  true
                                )
                              }
                              onBlur={handleCellBlur}
                              autoFocus
                              className="w-full bg-white dark:bg-black border border-neutral-400 dark:border-neutral-600 px-1.5 py-0.5 outline-none font-mono"
                            />
                          ) : (
                            <div className="font-mono truncate min-h-[18px] cursor-text">
                              {val !== undefined && val !== null ? (
                                String(val)
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-700 italic">—</span>
                              )}
                            </div>
                          )
                        )}

                        {/* Date Input */}
                        {f.type === 'date' && (
                          isEditing ? (
                            <input
                              type="date"
                              value={val !== undefined && val !== null ? String(val) : ''}
                              onChange={(e) => updateCell(activeTable.id, row.id, f.id, e.target.value, false)}
                              onBlur={handleCellBlur}
                              autoFocus
                              className="w-full bg-white dark:bg-black border border-neutral-400 dark:border-neutral-600 px-1 py-0.5 outline-none font-mono text-xs"
                            />
                          ) : (
                            <div className="font-mono truncate min-h-[18px] flex items-center space-x-1.5 cursor-text text-neutral-800 dark:text-neutral-200">
                              {val ? (
                                <>
                                  <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span>{String(val)}</span>
                                </>
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-700 italic">—</span>
                              )}
                            </div>
                          )
                        )}

                        {/* URL Link Input */}
                        {f.type === 'url' && (
                          isEditing ? (
                            <input
                              type="url"
                              value={val !== undefined && val !== null ? String(val) : ''}
                              onChange={(e) => updateCell(activeTable.id, row.id, f.id, e.target.value, true)}
                              onBlur={handleCellBlur}
                              placeholder="https://..."
                              autoFocus
                              className="w-full bg-white dark:bg-black border border-neutral-400 dark:border-neutral-600 px-1.5 py-0.5 outline-none font-mono text-xs"
                            />
                          ) : (
                            <div className="font-mono truncate min-h-[18px] flex items-center justify-between group/link">
                              {val ? (
                                <>
                                  <span className="truncate text-blue-600 dark:text-blue-400 hover:underline cursor-text">
                                    {String(val)}
                                  </span>
                                  <a
                                    href={String(val).startsWith('http') ? String(val) : `https://${String(val)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-0.5 text-neutral-400 hover:text-black dark:hover:text-white shrink-0 ml-1"
                                    title="Open link in new tab"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </>
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-700 italic">—</span>
                              )}
                            </div>
                          )
                        )}

                        {/* Select Dropdown */}
                        {f.type === 'select' && (
                          <div className="relative">
                            <select
                              value={val !== undefined && val !== null ? String(val) : ''}
                              onChange={(e) => updateCell(activeTable.id, row.id, f.id, e.target.value, false)}
                              className="w-full bg-transparent border-0 outline-none cursor-pointer text-xs font-mono py-0.5 pr-2 truncate text-neutral-800 dark:text-neutral-200"
                            >
                              <option value="">— None —</option>
                              {(f.options || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Multi-Select Tags */}
                        {f.type === 'multi_select' && (
                          <MultiSelectCell
                            field={f}
                            value={val}
                            onChange={(newTags) => updateCell(activeTable.id, row.id, f.id, newTags, false)}
                          />
                        )}

                        {/* Checkbox Toggle */}
                        {f.type === 'checkbox' && (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={(e) => updateCell(activeTable.id, row.id, f.id, e.target.checked, false)}
                              className="w-4 h-4 rounded-none accent-black dark:accent-white cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Relation Popover */}
                        {f.type === 'relation' && (
                          <RelationCell
                            field={f}
                            value={val}
                            onChange={(newId) => updateCell(activeTable.id, row.id, f.id, newId, false)}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Empty cell for Add Column column */}
                  <td className="w-16 border-r border-neutral-200 dark:border-neutral-800" />

                  {/* Row Actions: Duplicate & Delete */}
                  <td className="w-16 px-2 py-1.5 text-center">
                    <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-1 transition-opacity">
                      <button
                        onClick={() => duplicateRow(activeTable.id, row.id)}
                        className="text-neutral-400 hover:text-black dark:hover:text-white p-1 cursor-pointer"
                        title="Duplicate record"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModalConfig({
                            isOpen: true,
                            rowIds: [row.id],
                            title: 'Delete Record',
                          })
                        }
                        className="text-neutral-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Sticky Summary & Aggregation Footer */}
          <tfoot className="sticky bottom-0 z-20 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-300 dark:border-neutral-700 font-mono text-[11px] select-none shadow-xs">
            <tr>
              <td className="sticky left-0 z-30 bg-neutral-100 dark:bg-neutral-900 w-12 px-2 py-2 text-center text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 font-semibold">
                <Sigma className="w-3.5 h-3.5 mx-auto text-neutral-500" />
              </td>

              {fields.map((f) => (
                <td
                  key={f.id}
                  className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono"
                >
                  {f.type === 'number' ? (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-black dark:text-white">
                        {aggregations[f.id]}
                      </span>
                      <select
                        value={numberAggregations[f.id] || 'sum'}
                        onChange={(e) =>
                          setNumberAggregations((prev) => ({
                            ...prev,
                            [f.id]: e.target.value as NumberAggType,
                          }))
                        }
                        className="bg-transparent border-0 outline-none text-[10px] text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer ml-1"
                      >
                        <option value="sum">Sum</option>
                        <option value="avg">Avg</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                        <option value="count">Count</option>
                      </select>
                    </div>
                  ) : (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {aggregations[f.id]}
                    </span>
                  )}
                </td>
              ))}

              <td className="w-16 border-r border-neutral-200 dark:border-neutral-800" />
              <td className="w-16" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Inline Add Row Button at bottom of table */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between select-none">
        <button
          onClick={() => addRow(activeTable.id)}
          className="flex items-center space-x-1.5 text-xs font-mono text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add record inline</span>
        </button>

        <span className="font-mono text-[11px] text-neutral-400">
          {filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedRowIds.size > 0 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 bg-black dark:bg-white text-white dark:text-black px-4 py-2 shadow-2xl flex items-center space-x-3 text-xs font-mono border border-neutral-800 dark:border-neutral-200 animate-in fade-in slide-in-from-bottom-2">
          <span className="font-bold">
            {selectedRowIds.size} {selectedRowIds.size === 1 ? 'record' : 'records'} selected
          </span>
          <div className="h-3 w-[1px] bg-neutral-600 dark:bg-neutral-300" />
          <button
            onClick={handleBulkDuplicate}
            className="flex items-center space-x-1 hover:text-neutral-300 dark:hover:text-neutral-700 cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={() =>
              setDeleteModalConfig({
                isOpen: true,
                rowIds: Array.from(selectedRowIds),
                title: 'Delete Selected Records',
              })
            }
            className="flex items-center space-x-1 text-red-400 dark:text-red-600 hover:underline cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => setSelectedRowIds(new Set())}
            className="p-1 hover:text-neutral-300 dark:hover:text-neutral-700 cursor-pointer ml-1"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Field Configuration Modal */}
      <FieldConfigModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        tableId={activeTable.id}
        field={modalField}
      />

      {/* Safe Delete Helper Modal */}
      <SafeDeleteModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, rowIds: [], title: '' })}
        onConfirm={handleConfirmDelete}
        title={deleteModalConfig.title}
        count={deleteModalConfig.rowIds.length}
      />
    </div>
  );
}
