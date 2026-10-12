'use client';

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { RecordRow } from '../types/database';
import { RelationCell } from './RelationCell';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface ListViewProps {
  filteredRows: RecordRow[];
}

export function ListView({ filteredRows }: ListViewProps) {
  const { activeTable, addRow, updateCell, deleteRow } = useDatabase();

  const primaryField = activeTable.fields.find((f) => f.type === 'text') || activeTable.fields[0];
  const checkboxField = activeTable.fields.find((f) => f.type === 'checkbox');
  const otherFields = activeTable.fields.filter(
    (f) => f.id !== primaryField?.id && f.id !== checkboxField?.id
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
      {/* List Header */}
      <div className="px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs select-none">
        <span className="font-mono text-neutral-400 uppercase text-[11px]">Roster / Checklist Layout</span>
        <button
          onClick={() => addRow(activeTable.id)}
          className="flex items-center space-x-1 font-mono text-xs border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>New Item</span>
        </button>
      </div>

      {/* Roster Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
        {filteredRows.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-neutral-400">
            No records in this list view.
          </div>
        ) : (
          filteredRows.map((row) => {
            const isChecked = checkboxField ? Boolean(row[checkboxField.id]) : false;
            const title = primaryField && row[primaryField.id] ? String(row[primaryField.id]) : '';

            return (
              <div
                key={row.id}
                className="group px-6 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
              >
                {/* Left: Checkbox & Title */}
                <div className="flex items-center space-x-3 flex-1 mr-4">
                  {checkboxField && (
                    <button
                      onClick={() =>
                        updateCell(activeTable.id, row.id, checkboxField.id, !isChecked, false)
                      }
                      className="text-neutral-400 hover:text-black dark:hover:text-white"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {primaryField && (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) =>
                        updateCell(activeTable.id, row.id, primaryField.id, e.target.value, true)
                      }
                      placeholder="Item name..."
                      className={`flex-1 text-xs font-medium bg-transparent outline-none ${
                        isChecked ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    />
                  )}
                </div>

                {/* Right: Metadata attributes and actions */}
                <div className="flex items-center space-x-4">
                  <div className="hidden sm:flex items-center space-x-3">
                    {otherFields.map((f) => {
                      const val = row[f.id];
                      if (val === undefined || val === null || val === '') return null;

                      if (f.type === 'relation') {
                        return (
                          <div key={f.id} className="text-xs">
                            <RelationCell
                              field={f}
                              value={val}
                              onChange={(newId) =>
                                updateCell(activeTable.id, row.id, f.id, newId, false)
                              }
                            />
                          </div>
                        );
                      }

                      return (
                        <span
                          key={f.id}
                          className="font-mono text-xs px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                        >
                          {String(val)}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => deleteRow(activeTable.id, row.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-1"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom inline add */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-6 py-2 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between select-none">
        <button
          onClick={() => addRow(activeTable.id)}
          className="flex items-center space-x-1.5 text-xs font-mono text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add item</span>
        </button>
        <span className="font-mono text-[11px] text-neutral-400">
          {filteredRows.length} items
        </span>
      </div>
    </div>
  );
}
