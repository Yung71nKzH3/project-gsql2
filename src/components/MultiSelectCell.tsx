'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Field, CellValue } from '../types/database';
import { Tags, Check, Plus } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

interface MultiSelectCellProps {
  field: Field;
  value: CellValue;
  onChange: (newValue: string[]) => void;
  readOnly?: boolean;
}

export function MultiSelectCell({ field, value, onChange, readOnly = false }: MultiSelectCellProps) {
  const { updateField, activeTable } = useDatabase();
  const [isOpen, setIsOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Normalize value to string array
  const currentTags: string[] = Array.isArray(value)
    ? (value as string[])
    : typeof value === 'string' && value.trim()
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const availableOptions: string[] = field.options || [];

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

  const toggleTag = (tag: string) => {
    if (currentTags.includes(tag)) {
      onChange(currentTags.filter((t) => t !== tag));
    } else {
      onChange([...currentTags, tag]);
    }
  };

  const handleAddNewOption = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!availableOptions.includes(trimmed)) {
      updateField(activeTable.id, field.id, {
        options: [...availableOptions, trimmed],
      });
    }
    if (!currentTags.includes(trimmed)) {
      onChange([...currentTags, trimmed]);
    }
    setNewTagInput('');
  };

  if (readOnly) {
    if (currentTags.length === 0) return <span className="text-neutral-400 text-xs italic">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {currentTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="relative inline-block w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left flex items-center justify-between min-h-[22px] py-0.5 px-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-colors group cursor-pointer"
      >
        {currentTags.length > 0 ? (
          <div className="flex flex-wrap gap-1 items-center max-w-full overflow-hidden">
            {currentTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 text-[10px] font-mono border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
              >
                <span className="truncate max-w-[80px]">{tag}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-neutral-300 dark:text-neutral-700 italic font-mono text-xs">—</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 shadow-2xl z-50 p-2 text-xs select-none">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-200 dark:border-neutral-800">
            <span className="font-mono text-[10px] uppercase text-neutral-400 flex items-center space-x-1">
              <Tags className="w-3 h-3" />
              <span>Select Tags</span>
            </span>
            {currentTags.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-mono text-neutral-400 hover:text-red-500 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Tag Options Checklist */}
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {availableOptions.length === 0 ? (
              <div className="p-2 text-center text-neutral-400 font-mono text-[11px]">
                No tags defined yet.
              </div>
            ) : (
              availableOptions.map((opt) => {
                const isSelected = currentTags.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleTag(opt)}
                    className={`w-full text-left px-2 py-1 flex items-center justify-between transition-colors text-xs font-mono cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-100 dark:bg-neutral-900 font-semibold text-black dark:text-white'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-950 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="w-3 h-3 text-black dark:text-white shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Add custom tag input */}
          <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center space-x-1">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewOption();
                }
              }}
              placeholder="Add new tag..."
              className="flex-1 text-[11px] font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-1.5 py-1 outline-none focus:border-black dark:focus:border-white"
            />
            <button
              type="button"
              onClick={handleAddNewOption}
              className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              title="Add tag"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
