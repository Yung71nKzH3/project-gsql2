'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Field, RecordRow } from '../types/database';
import { Link2, Search, X, Check, AlertTriangle } from 'lucide-react';

interface RelationCellProps {
  field: Field;
  value: any; // ID of referenced row
  onChange: (newRowId: string | null) => void;
  readOnly?: boolean;
}

export function RelationCell({ field, value, onChange, readOnly = false }: RelationCellProps) {
  const { state } = useDatabase();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Find target table
  const targetTable = state.tables.find((t) => t.id === field.relationTableId);
  const targetRow = targetTable?.rows.find((r) => r.id === value);
  const displayFieldId = field.relationDisplayFieldId || targetTable?.fields[0]?.id;

  // Cascading Integrity Check
  const isOrphaned = Boolean(value && !targetRow);

  // Display label
  let displayLabel = '—';
  if (isOrphaned) {
    displayLabel = `Orphaned (${String(value).slice(0, 8)})`;
  } else if (targetRow && displayFieldId) {
    displayLabel = targetRow[displayFieldId] !== undefined ? String(targetRow[displayFieldId]) : '(Empty)';
  }

  // Filtered rows for popover
  const candidateRows = (targetTable?.rows || []).filter((r) => {
    if (!search.trim()) return true;
    const label = displayFieldId && r[displayFieldId] !== undefined ? String(r[displayFieldId]) : '';
    return label.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  if (readOnly) {
    if (!value) return <span className="text-neutral-400 text-xs">—</span>;
    if (isOrphaned) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 text-[11px] font-mono border border-dashed border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/50">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>{displayLabel}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900">
        <Link2 className="w-2.5 h-2.5 text-neutral-500" />
        <span className="truncate max-w-[140px]">{displayLabel}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left flex items-center justify-between text-xs py-1 px-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-colors group"
      >
        {isOrphaned ? (
          <span className="inline-flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="truncate">{displayLabel}</span>
          </span>
        ) : value ? (
          <span className="inline-flex items-center space-x-1.5 px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-[11px]">
            <Link2 className="w-3 h-3 text-neutral-400" />
            <span className="truncate max-w-[120px]">{displayLabel}</span>
          </span>
        ) : (
          <span className="text-neutral-400 italic font-mono text-[11px]">Link record...</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 shadow-2xl z-50 p-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-200 dark:border-neutral-800">
            <span className="font-mono text-[10px] uppercase text-neutral-400">
              Link from: {targetTable?.name || 'Unknown Table'}
            </span>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="text-[10px] font-mono text-red-500 hover:underline flex items-center space-x-0.5"
              >
                <X className="w-2.5 h-2.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="flex items-center space-x-1 border border-neutral-200 dark:border-neutral-800 px-2 py-1 mb-2 bg-neutral-50 dark:bg-neutral-950">
            <Search className="w-3 h-3 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search target records..."
              className="w-full bg-transparent outline-none text-xs"
              autoFocus
            />
          </div>

          {/* Records list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {candidateRows.length === 0 ? (
              <div className="p-2 text-center text-neutral-400 font-mono text-[11px]">
                No matching records found.
              </div>
            ) : (
              candidateRows.map((r) => {
                const label = displayFieldId && r[displayFieldId] !== undefined ? String(r[displayFieldId]) : '(Empty)';
                const isSelected = r.id === value;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onChange(r.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-neutral-200 dark:bg-neutral-800 font-semibold'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    {isSelected && <Check className="w-3 h-3 text-black dark:text-white" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
