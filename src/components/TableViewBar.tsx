'use client';

import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { ViewType } from '../types/database';
import {
  Table2,
  LayoutGrid,
  Kanban,
  ListTodo,
  Plus,
  Trash2,
  ChevronDown,
  Edit2,
  Check,
} from 'lucide-react';

export function TableViewBar() {
  const {
    state,
    activeTable,
    activeView,
    setActiveViewId,
    addView,
    deleteView,
    deleteTable,
    renameTable,
    addTable,
  } = useDatabase();

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState('');
  const [showAddViewMenu, setShowAddViewMenu] = useState(false);

  const tableViews = state.views.filter((v) => v.tableId === activeTable.id);

  const getViewIcon = (type: ViewType) => {
    switch (type) {
      case 'table':
        return <Table2 className="w-3.5 h-3.5" />;
      case 'card':
        return <LayoutGrid className="w-3.5 h-3.5" />;
      case 'kanban':
        return <Kanban className="w-3.5 h-3.5" />;
      case 'list':
        return <ListTodo className="w-3.5 h-3.5" />;
    }
  };

  const handleStartRename = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingTableName(currentName);
  };

  const handleSaveRename = (tableId: string) => {
    if (editingTableName.trim()) {
      renameTable(tableId, editingTableName.trim());
    }
    setEditingTableId(null);
  };

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 pt-2 flex flex-col space-y-2 select-none">
      {/* Tables Row */}
      <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 uppercase mr-1 tracking-wider">
          Tables:
        </span>
        {state.tables.map((tbl) => {
          const isActive = tbl.id === activeTable.id;
          const isEditing = editingTableId === tbl.id;

          return (
            <div
              key={tbl.id}
              className={`group flex items-center border-t border-l border-r px-2.5 py-1.5 text-xs font-mono transition-colors ${
                isActive
                  ? 'bg-white dark:bg-black text-black dark:text-white border-neutral-300 dark:border-neutral-700 font-semibold'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-transparent hover:border-neutral-200 dark:hover:border-neutral-800'
              }`}
            >
              {isEditing ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={editingTableName}
                    onChange={(e) => setEditingTableName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(tbl.id);
                    }}
                    autoFocus
                    className="w-24 px-1 py-0 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 outline-none text-xs"
                  />
                  <button onClick={() => handleSaveRename(tbl.id)}>
                    <Check className="w-3 h-3 text-emerald-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    // Switch to first view for this table
                    const firstView = state.views.find((v) => v.tableId === tbl.id);
                    if (firstView) {
                      setActiveViewId(firstView.id);
                    } else {
                      addView(tbl.id, 'table', `${tbl.name} Grid`);
                    }
                  }}
                  className="flex items-center space-x-1.5 focus:outline-none"
                >
                  <span>{tbl.name}</span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
                    ({tbl.rows.length})
                  </span>
                </button>
              )}

              {/* Table actions */}
              <div className="hidden group-hover:flex items-center ml-2 space-x-1">
                {!isEditing && (
                  <button
                    onClick={() => handleStartRename(tbl.id, tbl.name)}
                    className="text-neutral-400 hover:text-black dark:hover:text-white p-0.5"
                    title="Rename table"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                )}
                {state.tables.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete table "${tbl.name}" and its views?`)) {
                        deleteTable(tbl.id);
                      }
                    }}
                    className="text-neutral-400 hover:text-red-500 p-0.5"
                    title="Delete table"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => addTable()}
          className="p-1 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          title="New Table"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Views Row for Current Active Table */}
      <div className="flex items-center space-x-1.5 pb-2 pt-0.5 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 uppercase mr-1 tracking-wider">
          Views:
        </span>
        {tableViews.map((v) => {
          const isActive = v.id === activeView.id;
          return (
            <div
              key={v.id}
              className={`group flex items-center border text-xs px-2.5 py-1 rounded-none font-medium transition-colors ${
                isActive
                  ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <button
                onClick={() => setActiveViewId(v.id)}
                className="flex items-center space-x-1.5 focus:outline-none"
              >
                {getViewIcon(v.type)}
                <span>{v.name}</span>
              </button>

              {tableViews.length > 1 && (
                <button
                  onClick={() => deleteView(v.id)}
                  className={`ml-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-opacity ${
                    isActive ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-400'
                  }`}
                  title="Remove view"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add View Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddViewMenu((prev) => !prev)}
            className="flex items-center space-x-1 text-xs border border-dashed border-neutral-300 dark:border-neutral-700 px-2 py-1 text-neutral-500 hover:text-black dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
            title="Create view"
          >
            <Plus className="w-3 h-3" />
            <span className="font-mono text-[11px]">ADD VIEW</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showAddViewMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAddViewMenu(false)}
              />
              <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-xl z-50 py-1 text-xs">
                <button
                  onClick={() => {
                    addView(activeTable.id, 'table', `${activeTable.name} Grid`);
                    setShowAddViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>Table / Grid</span>
                </button>
                <button
                  onClick={() => {
                    addView(activeTable.id, 'card', `${activeTable.name} Cards`);
                    setShowAddViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Card / Gallery</span>
                </button>
                <button
                  onClick={() => {
                    addView(activeTable.id, 'kanban', `${activeTable.name} Kanban`);
                    setShowAddViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Kanban Board</span>
                </button>
                <button
                  onClick={() => {
                    addView(activeTable.id, 'list', `${activeTable.name} List`);
                    setShowAddViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>List View</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
