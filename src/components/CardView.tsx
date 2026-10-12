'use client';

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { RecordRow } from '../types/database';
import { RelationCell } from './RelationCell';
import { MultiSelectCell } from './MultiSelectCell';
import { Plus, Trash2, Copy, ExternalLink, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardViewProps {
  filteredRows: RecordRow[];
}

export function CardView({ filteredRows }: CardViewProps) {
  const { activeTable, addRow, deleteRow, duplicateRow, updateCell } = useDatabase();

  const fields = activeTable.fields;
  const primaryField = fields[0];
  const secondaryFields = fields.slice(1);

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
          className="flex items-center space-x-1 font-mono text-xs border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>New Card</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredRows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-2">
            <span className="font-mono text-xs">No records found.</span>
            <button
              onClick={() => addRow(activeTable.id)}
              className="font-mono text-xs underline hover:text-black dark:hover:text-white cursor-pointer"
            >
              Create first card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRows.map((row) => {
              const titleVal = primaryField ? row[primaryField.id] : '';

              return (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="group bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all shadow-xs flex flex-col justify-between"
                >
                  <div className="p-4">
                    {/* Card Title & Actions */}
                    <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-900 mb-3">
                      <div className="flex-1 mr-2">
                        {primaryField && (
                          <input
                            type="text"
                            value={titleVal !== undefined && titleVal !== null ? String(titleVal) : ''}
                            onChange={(e) =>
                              updateCell(activeTable.id, row.id, primaryField.id, e.target.value, true)
                            }
                            placeholder="Untitled..."
                            className="w-full text-sm font-semibold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-neutral-400"
                          />
                        )}
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => duplicateRow(activeTable.id, row.id)}
                          className="text-neutral-400 hover:text-black dark:hover:text-white p-1 cursor-pointer"
                          title="Duplicate card"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteRow(activeTable.id, row.id)}
                          className="text-neutral-400 hover:text-red-500 p-1 cursor-pointer"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                                value={val !== undefined && val !== null ? String(val) : ''}
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
                                placeholder="0"
                                className="w-full font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 outline-none text-xs"
                              />
                            )}

                            {f.type === 'date' && (
                              <div className="flex items-center space-x-1.5">
                                <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                                <input
                                  type="date"
                                  value={val !== undefined && val !== null ? String(val) : ''}
                                  onChange={(e) =>
                                    updateCell(activeTable.id, row.id, f.id, e.target.value, false)
                                  }
                                  className="w-full font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-0.5 outline-none text-xs"
                                />
                              </div>
                            )}

                            {f.type === 'url' && (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="url"
                                  value={val !== undefined && val !== null ? String(val) : ''}
                                  onChange={(e) =>
                                    updateCell(activeTable.id, row.id, f.id, e.target.value, true)
                                  }
                                  placeholder="https://..."
                                  className="flex-1 font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 outline-none text-xs"
                                />
                                {val && (
                                  <a
                                    href={String(val).startsWith('http') ? String(val) : `https://${String(val)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-neutral-400 hover:text-black dark:hover:text-white"
                                    title="Open link"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}

                            {f.type === 'select' && (
                              <select
                                value={val !== undefined && val !== null ? String(val) : ''}
                                onChange={(e) =>
                                  updateCell(activeTable.id, row.id, f.id, e.target.value, false)
                                }
                                className="w-full font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 outline-none text-xs cursor-pointer"
                              >
                                <option value="">— None —</option>
                                {(f.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {f.type === 'multi_select' && (
                              <MultiSelectCell
                                field={f}
                                value={val}
                                onChange={(newTags) =>
                                  updateCell(activeTable.id, row.id, f.id, newTags, false)
                                }
                              />
                            )}

                            {f.type === 'checkbox' && (
                              <label className="flex items-center space-x-2 cursor-pointer pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={Boolean(val)}
                                  onChange={(e) =>
                                    updateCell(activeTable.id, row.id, f.id, e.target.checked, false)
                                  }
                                  className="w-4 h-4 rounded-none accent-black dark:accent-white cursor-pointer"
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
