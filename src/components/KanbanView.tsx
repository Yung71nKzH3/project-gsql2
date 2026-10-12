'use client';

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { RecordRow, CellValue } from '../types/database';
import { RelationCell } from './RelationCell';
import { MultiSelectCell } from './MultiSelectCell';
import { Plus, Trash2, Copy, MoveRight, MoveLeft, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface KanbanViewProps {
  filteredRows: RecordRow[];
}

export function KanbanView({ filteredRows }: KanbanViewProps) {
  const {
    state,
    activeTable,
    activeView,
    updateViewConfig,
    addRow,
    updateCell,
    deleteRow,
    duplicateRow,
  } = useDatabase();

  // Pick group by field (select or relation or default to first select)
  const groupableFields = activeTable.fields.filter(
    (f) => f.type === 'select' || f.type === 'relation'
  );

  const activeGroupByFieldId =
    activeView.groupByFieldId || groupableFields[0]?.id || activeTable.fields[0]?.id;

  const groupByField = activeTable.fields.find((f) => f.id === activeGroupByFieldId);

  // Derive columns
  let columns: { id: string; label: string; rawValue: CellValue }[] = [];

  if (groupByField?.type === 'select' && groupByField.options) {
    columns = [
      ...groupByField.options.map((opt) => ({
        id: opt,
        label: opt,
        rawValue: opt,
      })),
      { id: '__unassigned__', label: 'Unassigned', rawValue: null },
    ];
  } else if (groupByField?.type === 'relation' && groupByField.relationTableId) {
    const targetTable = state.tables.find((t) => t.id === groupByField.relationTableId);
    const displayFieldId = groupByField.relationDisplayFieldId || targetTable?.fields[0]?.id;

    const targetCols = (targetTable?.rows || []).map((r) => {
      const label = displayFieldId && r[displayFieldId] ? String(r[displayFieldId]) : r.id;
      return {
        id: r.id,
        label,
        rawValue: r.id,
      };
    });

    columns = [
      ...targetCols,
      { id: '__unassigned__', label: 'Unassigned', rawValue: null },
    ];
  } else {
    // Fallback columns
    columns = [
      { id: 'Todo', label: 'Todo', rawValue: 'Todo' },
      { id: 'In Progress', label: 'In Progress', rawValue: 'In Progress' },
      { id: 'Done', label: 'Done', rawValue: 'Done' },
    ];
  }

  // Primary title field for cards
  const primaryField = activeTable.fields.find((f) => f.type === 'text') || activeTable.fields[0];

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnRawValue: CellValue) => {
    e.preventDefault();
    const rowId = e.dataTransfer.getData('text/plain');
    if (rowId && groupByField) {
      updateCell(activeTable.id, rowId, groupByField.id, targetColumnRawValue, false);
    }
  };

  const handleAddInColumn = (rawValue: CellValue) => {
    if (groupByField) {
      addRow(activeTable.id, {
        [groupByField.id]: rawValue,
      });
    } else {
      addRow(activeTable.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/40 dark:bg-neutral-950/40">
      {/* Board Controls: Select Grouping Field */}
      <div className="px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between text-xs select-none">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-neutral-400 uppercase text-[11px]">Group By Column:</span>
          <select
            value={activeGroupByFieldId}
            onChange={(e) => updateViewConfig(activeView.id, { groupByFieldId: e.target.value })}
            className="font-mono text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-2 py-1 outline-none font-semibold cursor-pointer"
          >
            {groupableFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.type})
              </option>
            ))}
            {groupableFields.length === 0 && (
              <option value="">No Select / Relation field found</option>
            )}
          </select>
        </div>

        <button
          onClick={() => addRow(activeTable.id)}
          className="flex items-center space-x-1 font-mono text-xs border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>New Record</span>
        </button>
      </div>

      {/* Columns Board */}
      <div className="flex-1 overflow-x-auto p-6 flex space-x-4 items-start select-none">
        {columns.map((col, colIdx) => {
          // Find rows in this column
          const colRows = filteredRows.filter((r) => {
            const val = groupByField ? r[groupByField.id] : undefined;
            if (col.id === '__unassigned__') {
              return val === null || val === undefined || val === '';
            }
            return String(val) === String(col.rawValue);
          });

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.rawValue)}
              className="w-80 flex-shrink-0 bg-neutral-100/70 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[calc(100vh-210px)]"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold tracking-tight uppercase">
                    {col.label}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800">
                    {colRows.length}
                  </span>
                </div>

                <button
                  onClick={() => handleAddInColumn(col.rawValue)}
                  className="p-1 text-neutral-400 hover:text-black dark:hover:text-white"
                  title="Add card to column"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column Cards */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {colRows.map((row) => {
                  const title = primaryField && row[primaryField.id] ? String(row[primaryField.id]) : 'Untitled';

                  return (
                    <motion.div
                      key={row.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, row.id)}
                      className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white p-3 cursor-grab active:cursor-grabbing shadow-xs transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-1.5 flex-1 mr-2">
                          <GripVertical className="w-3 h-3 text-neutral-300 dark:text-neutral-700 opacity-0 group-hover:opacity-100" />
                          <span className="text-xs font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
                            {title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => duplicateRow(activeTable.id, row.id)}
                            className="text-neutral-400 hover:text-black dark:hover:text-white p-0.5 cursor-pointer"
                            title="Duplicate card"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteRow(activeTable.id, row.id)}
                            className="text-neutral-400 hover:text-red-500 p-0.5 cursor-pointer"
                            title="Delete card"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Display other fields as subtle chips */}
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-900 flex flex-wrap gap-1">
                        {activeTable.fields
                          .filter((f) => f.id !== primaryField?.id && f.id !== groupByField?.id)
                          .map((f) => {
                            const val = row[f.id];
                            if (val === undefined || val === null || val === '') return null;

                            if (f.type === 'relation') {
                              return (
                                <div key={f.id} className="text-[10px]">
                                  <RelationCell
                                    field={f}
                                    value={val}
                                    onChange={(newId) =>
                                      updateCell(activeTable.id, row.id, f.id, newId, false)
                                    }
                                    readOnly={true}
                                  />
                                </div>
                              );
                            }

                            if (f.type === 'multi_select') {
                              return (
                                <div key={f.id} className="text-[10px]">
                                  <MultiSelectCell
                                    field={f}
                                    value={val}
                                    readOnly={true}
                                    onChange={() => {}}
                                  />
                                </div>
                              );
                            }

                            return (
                              <span
                                key={f.id}
                                className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                              >
                                {f.name}: {f.type === 'checkbox' ? (val ? 'Yes' : 'No') : String(val)}
                              </span>
                            );
                          })}
                      </div>

                      {/* Quick Move Row Action */}
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-900">
                        {colIdx > 0 ? (
                          <button
                            onClick={() => {
                              const prevCol = columns[colIdx - 1];
                              if (groupByField) {
                                updateCell(activeTable.id, row.id, groupByField.id, prevCol.rawValue, false);
                              }
                            }}
                            className="flex items-center space-x-0.5 hover:text-black dark:hover:text-white"
                          >
                            <MoveLeft className="w-2.5 h-2.5" />
                            <span>Move</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        {colIdx < columns.length - 1 ? (
                          <button
                            onClick={() => {
                              const nextCol = columns[colIdx + 1];
                              if (groupByField) {
                                updateCell(activeTable.id, row.id, groupByField.id, nextCol.rawValue, false);
                              }
                            }}
                            className="flex items-center space-x-0.5 hover:text-black dark:hover:text-white"
                          >
                            <span>Move</span>
                            <MoveRight className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {colRows.length === 0 && (
                  <div className="py-8 text-center text-neutral-400 font-mono text-[11px] border border-dashed border-neutral-200 dark:border-neutral-800">
                    Drop items here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
