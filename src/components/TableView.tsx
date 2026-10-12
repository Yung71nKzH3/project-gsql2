'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Field, RecordRow } from '../types/database';
import { RelationCell } from './RelationCell';
import { FieldConfigModal } from './FieldConfigModal';
import {
  Plus,
  Trash2,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Check,
  Type,
  Hash,
  ListFilter,
  CheckSquare,
  Link as LinkIcon,
} from 'lucide-react';

interface TableViewProps {
  filteredRows: RecordRow[];
}

export function TableView({ filteredRows }: TableViewProps) {
  const { activeTable, updateCell, deleteRow, addRow, reorderFields } = useDatabase();
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [modalField, setModalField] = useState<Field | undefined>(undefined);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const fields = activeTable.fields;

  // Keyboard navigation across cells
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFieldModalOpen) return;
      if (editingCell) {
        if (e.key === 'Escape') {
          setEditingCell(null);
        } else if (e.key === 'Enter') {
          // Commit edit and move to next row
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
        if (currentField && currentField.type !== 'checkbox' && currentField.type !== 'relation') {
          setEditingCell({ rowIdx, colIdx });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, editingCell, filteredRows.length, fields, isFieldModalOpen]);

  const getFieldIcon = (type: Field['type']) => {
    switch (type) {
      case 'text':
        return <Type className="w-3 h-3 text-neutral-400" />;
      case 'number':
        return <Hash className="w-3 h-3 text-neutral-400" />;
      case 'select':
        return <ListFilter className="w-3 h-3 text-neutral-400" />;
      case 'checkbox':
        return <CheckSquare className="w-3 h-3 text-neutral-400" />;
      case 'relation':
        return <LinkIcon className="w-3 h-3 text-neutral-400" />;
    }
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black" ref={tableContainerRef}>
      {/* Scrollable table grid */}
      <div className="flex-1 overflow-auto border-b border-neutral-200 dark:border-neutral-800">
        <table className="w-full border-collapse text-xs text-left">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-neutral-400 font-mono text-[10px] border-r border-neutral-200 dark:border-neutral-800">
                #
              </th>
              {fields.map((f, colIdx) => (
                <th
                  key={f.id}
                  className="group relative min-w-[160px] max-w-[240px] px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 truncate">
                      {getFieldIcon(f.type)}
                      <span className="truncate">{f.name}</span>
                    </div>

                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-0.5">
                      {/* Column Reordering buttons */}
                      {colIdx > 0 && (
                        <button
                          onClick={() => reorderFields(activeTable.id, colIdx, colIdx - 1)}
                          className="p-0.5 text-neutral-400 hover:text-black dark:hover:text-white"
                          title="Move column left"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {colIdx < fields.length - 1 && (
                        <button
                          onClick={() => reorderFields(activeTable.id, colIdx, colIdx + 1)}
                          className="p-0.5 text-neutral-400 hover:text-black dark:hover:text-white"
                          title="Move column right"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Column Settings Modal Trigger */}
                      <button
                        onClick={() => {
                          setModalField(f);
                          setIsFieldModalOpen(true);
                        }}
                        className="p-0.5 text-neutral-400 hover:text-black dark:hover:text-white"
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
                  className="p-1 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  title="Add new column"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>

              {/* Row Action Header */}
              <th className="w-10 px-2 py-2 text-center text-neutral-400 font-mono text-[10px]"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredRows.map((row, rowIdx) => (
              <tr
                key={row.id}
                className="group hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors"
              >
                {/* Row Number */}
                <td className="w-10 px-2 py-2 text-center font-mono text-[11px] text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-950/30 select-none">
                  {rowIdx + 1}
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
                        if (f.type !== 'checkbox' && f.type !== 'relation') {
                          setEditingCell({ rowIdx, colIdx });
                        }
                      }}
                      className={`relative min-w-[160px] max-w-[240px] px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 transition-colors ${
                        isSelected
                          ? 'ring-1 ring-black dark:ring-white bg-neutral-100/50 dark:bg-neutral-900/50'
                          : ''
                      }`}
                    >
                      {/* Text / Number Input */}
                      {f.type === 'text' && (
                        isEditing ? (
                          <input
                            type="text"
                            value={val ?? ''}
                            onChange={(e) => updateCell(activeTable.id, row.id, f.id, e.target.value, true)}
                            onBlur={handleCellBlur}
                            autoFocus
                            className="w-full bg-white dark:bg-black border border-neutral-400 dark:border-neutral-600 px-1.5 py-0.5 outline-none font-sans"
                          />
                        ) : (
                          <div className="truncate min-h-[18px] cursor-text">{val !== undefined && val !== '' ? String(val) : <span className="text-neutral-300 dark:text-neutral-700 italic">—</span>}</div>
                        )
                      )}

                      {f.type === 'number' && (
                        isEditing ? (
                          <input
                            type="number"
                            value={val ?? ''}
                            onChange={(e) => updateCell(activeTable.id, row.id, f.id, e.target.value === '' ? null : Number(e.target.value), true)}
                            onBlur={handleCellBlur}
                            autoFocus
                            className="w-full bg-white dark:bg-black border border-neutral-400 dark:border-neutral-600 px-1.5 py-0.5 outline-none font-mono"
                          />
                        ) : (
                          <div className="font-mono truncate min-h-[18px] cursor-text">
                            {val !== undefined && val !== null ? String(val) : <span className="text-neutral-300 dark:text-neutral-700 italic">—</span>}
                          </div>
                        )
                      )}

                      {/* Select Dropdown */}
                      {f.type === 'select' && (
                        <div className="relative">
                          <select
                            value={val ?? ''}
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

                      {/* Foreign Key Relation Popover */}
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

                {/* Row Delete Action */}
                <td className="w-10 px-2 py-1.5 text-center">
                  <button
                    onClick={() => deleteRow(activeTable.id, row.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-1"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline Add Row Button at bottom of table */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-2 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between select-none">
        <button
          onClick={() => addRow(activeTable.id)}
          className="flex items-center space-x-1.5 text-xs font-mono text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add record inline</span>
        </button>

        <span className="font-mono text-[11px] text-neutral-400">
          {filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Field Configuration Modal */}
      <FieldConfigModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        tableId={activeTable.id}
        field={modalField}
      />
    </div>
  );
}
