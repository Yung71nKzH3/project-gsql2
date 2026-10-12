'use client';

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Search, Plus, Filter, ArrowUpDown } from 'lucide-react';

interface ControlBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedFilterFieldId: string;
  onFilterFieldChange: (fieldId: string) => void;
  sortFieldId: string;
  onSortFieldChange: (fieldId: string) => void;
  sortAsc: boolean;
  onToggleSortOrder: () => void;
}

export function ControlBar({
  searchQuery,
  onSearchChange,
  selectedFilterFieldId,
  onFilterFieldChange,
  sortFieldId,
  onSortFieldChange,
  sortAsc,
  onToggleSortOrder,
}: ControlBarProps) {
  const { activeTable, addRow } = useDatabase();

  return (
    <div className="h-11 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-4 flex items-center justify-between space-x-3 select-none">
      {/* Left: Search & Filter */}
      <div className="flex items-center space-x-2 flex-1 max-w-xl">
        {/* Search Input */}
        <div className="flex items-center space-x-2 border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 bg-neutral-50 dark:bg-neutral-900 w-56 sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search records..."
            className="w-full bg-transparent outline-none text-xs"
          />
        </div>

        {/* Filter by field dropdown */}
        <div className="hidden sm:flex items-center space-x-1 border border-neutral-200 dark:border-neutral-800 px-2 py-1 bg-white dark:bg-black text-xs font-mono">
          <Filter className="w-3 h-3 text-neutral-400" />
          <select
            value={selectedFilterFieldId}
            onChange={(e) => onFilterFieldChange(e.target.value)}
            className="bg-transparent outline-none text-neutral-600 dark:text-neutral-400 cursor-pointer"
          >
            <option value="all">All Fields</option>
            {activeTable.fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by field */}
        <div className="hidden md:flex items-center space-x-1 border border-neutral-200 dark:border-neutral-800 px-2 py-1 bg-white dark:bg-black text-xs font-mono">
          <span className="text-neutral-400">Sort:</span>
          <select
            value={sortFieldId}
            onChange={(e) => onSortFieldChange(e.target.value)}
            className="bg-transparent outline-none text-neutral-600 dark:text-neutral-400 cursor-pointer"
          >
            <option value="">None</option>
            {activeTable.fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {sortFieldId && (
            <button
              onClick={onToggleSortOrder}
              className="p-0.5 hover:text-black dark:hover:text-white"
              title={`Sorting: ${sortAsc ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Add Record Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => addRow(activeTable.id)}
          className="flex items-center space-x-1 text-xs font-mono border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors active:scale-95 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>NEW RECORD</span>
        </button>
      </div>
    </div>
  );
}
