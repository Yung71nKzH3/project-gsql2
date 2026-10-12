'use client';

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { RecordRow } from '../types/database';
import { RelationCell } from './RelationCell';
import { Plus, Trash2, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardViewProps {
  filteredRows: RecordRow[];
}

export function CardView({ filteredRows }: CardViewProps) {
  const { activeTable, activeView, updateViewConfig, addRow, deleteRow, updateCell } = useDatabase();

  const fields = activeTable.fields;
  const primaryField = fields[0];
  const secondaryFields = fields.slice(1);

  // Grouping field configuration
  const selectOrRelationFields = fields.filter((f) => f.type === 'select' || f.type === 'relation');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/50 dark:bg-neutral-950/50">
      {/* View Options Bar */}
      <div className="px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-neutral-400 uppercase text-[11px]">Display Mode:</span>
          <span className="font-medium">Gallery Grid</span>
        </div>

        <button
          onClick={() => addRow(activeTable.id)}
          className="flex items-center space-x-1 font-mono text-xs border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>New Card</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredRows.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
            <p className="text-xs font-mono text-neutral-500 mb-3">No records found matching query</p>
            <button
              onClick={() => addRow(activeTable.id)}
              className="px-3 py-1.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black text-xs font-mono"
            >
              Add First Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRows.map((row) => {
              const titleVal = primaryField ? row[primaryField.id] : '';
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all shadow-xs flex flex-col justify-between"
                >
                  <div className="p-4">
                    {/* Card Title & Actions */}
                    <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-900 mb-3">
                      <div className="flex-1 mr-2">
                        {primaryField && (
                          <input
                            type="text"
                            value={titleVal ?? ''}
                            onChange={(e) =>
                              updateCell(activeTable.id, row.id, primaryField.id, e.target.value, true)
                            }
                            placeholder="Untitled..."
                            className="w-full text-sm font-semibold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-neutral-400"
                          />
                        )}
                      </div>

                      <button
                        onClick={() => deleteRow(activeTable.id, row.id)}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-1"
                        title="Delete card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Secondary Attributes */}
                    <div className="space-y-2.5 text-xs">
                      {secondaryFields.map((f) => {
                        const val = row[f.id];
                        return (
                          <div key={f.id} className="flex flex-col space-y-1">
                            <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                              {f.name}
                            </span>

                            {f.type === 'text' && (
                              <input
                                type="text"
                                value={val ?? ''}
                                onChange={(e) =>
                                  updateCell(activeTable.id, row.id, f.id, e.target.value, true)
                                }
                                placeholder="Empty"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 outline-none text-xs"
                              />
                            )}

                            {f.type === 'number' && (
                              <input
                                type="number"
                                value={val ?? ''}
                                onChange={(e) =>
                                  updateCell(
                                    activeTable.id,
                                    row.id,
                                    f.id,
                                    e.target.value === '' ? null : Number(e.target.value),
                                    true
                                  )
                                }
                                placeholder="0"
                                className="w-full font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 outline-none text-xs"
                              />
                            )}

                            {f.type === 'select' && (
                              <select
                                value={val ?? ''}
                                onChange={(e) =>
                                  updateCell(activeTable.id, row.id, f.id, e.target.value, false)
                                }
                                className="w-full font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 outline-none text-xs"
                              >
                                <option value="">— None —</option>
                                {(f.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {f.type === 'checkbox' && (
                              <label className="flex items-center space-x-2 cursor-pointer pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={Boolean(val)}
                                  onChange={(e) =>
                                    updateCell(activeTable.id, row.id, f.id, e.target.checked, false)
                                  }
                                  className="w-4 h-4 rounded-none accent-black dark:accent-white"
                                />
                                <span className="font-mono text-[11px] text-neutral-500">
                                  {val ? 'Enabled' : 'Disabled'}
                                </span>
                              </label>
                            )}

                            {f.type === 'relation' && (
                              <RelationCell
                                field={f}
                                value={val}
                                onChange={(newId) =>
                                  updateCell(activeTable.id, row.id, f.id, newId, false)
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-900 font-mono text-[10px] text-neutral-400 flex justify-between">
                    <span>ID: {row.id.slice(0, 8)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
