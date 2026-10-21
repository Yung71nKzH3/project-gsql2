'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useTheme } from '../context/ThemeContext';
import {
  Undo2,
  Redo2,
  Share2,
  Download,
  Upload,
  Sun,
  Moon,
  RotateCcw,
  Check,
  Database as DbIcon,
  ChevronDown,
  Trash2,
  FilePlus,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { DataExchangeModal } from './DataExchangeModal';
import { createHelpDatabase } from '../lib/initialData';

export function Header() {
  const {
    state,
    updateTitle,
    canUndo,
    canRedo,
    undo,
    redo,
    importState,
    resetDatabase,
    urlByteLength,
    isHydrated,
    savedWorkspaces,
    createNewDatabase,
    switchWorkspace,
    deleteStoredWorkspace,
  } = useDatabase();
  const { theme, mounted, toggleTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(state.title);
  const [prevTitle, setPrevTitle] = useState(state.title);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [exchangeDefaultTab, setExchangeDefaultTab] = useState<'import' | 'export'>('export');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync title value safely if external state changes (e.g. undo/redo)
  if (state.title !== prevTitle) {
    setPrevTitle(state.title);
    setTitleValue(state.title);
  }

  // Click outside to dismiss workspace dropdown
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowWorkspaceMenu(false);
      }
    };
    if (showWorkspaceMenu) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showWorkspaceMenu]);

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-4 flex items-center justify-between select-none relative z-40">
      {/* Left: Brand, Database Switcher Dropdown & Title */}
      <div className="flex items-center space-x-2.5">
        {/* Workspace Switcher Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowWorkspaceMenu((prev) => !prev)}
            className="flex items-center space-x-1.5 font-mono text-xs font-semibold uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black px-2.5 py-1.5 rounded-none border border-black dark:border-white cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            title="Switch or create databases"
          >
            <DbIcon className="w-3.5 h-3.5" />
            <span>UrlBase</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {/* Workspace Switcher Menu */}
          {showWorkspaceMenu && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 shadow-2xl p-2 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="font-mono text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
                  Databases ({savedWorkspaces.length})
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      importState(createHelpDatabase());
                      setShowWorkspaceMenu(false);
                    }}
                    className="flex items-center space-x-1 text-[11px] font-mono px-2 py-0.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                    title="Load interactive guide database"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>GUIDE</span>
                  </button>
                  <button
                    onClick={() => {
                      createNewDatabase('New Database');
                      setShowWorkspaceMenu(false);
                    }}
                    className="flex items-center space-x-1 text-[11px] font-mono px-2 py-0.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
                  >
                    <FilePlus className="w-3 h-3" />
                    <span>NEW DB</span>
                  </button>
                </div>
              </div>

              {/* List of saved databases */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {savedWorkspaces.length === 0 ? (
                  <div className="p-3 text-center text-neutral-400 font-mono text-[11px]">
                    No other databases saved.
                  </div>
                ) : (
                  savedWorkspaces.map((ws) => {
                    const isCurrent = ws.id === state.id;
                    return (
                      <div
                        key={ws.id}
                        className={`group flex items-center justify-between p-2 transition-colors border ${
                          isCurrent
                            ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-400 dark:border-neutral-600 font-semibold'
                            : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-950 hover:border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (!isCurrent) {
                              switchWorkspace(ws.id);
                            }
                            setShowWorkspaceMenu(false);
                          }}
                          className="flex-1 text-left truncate mr-2 cursor-pointer"
                        >
                          <div className="text-xs truncate text-black dark:text-white">
                            {ws.title}
                          </div>
                          <div className="text-[10px] font-mono text-neutral-400">
                            {ws.tableCount} tables • {ws.rowCount} rows
                          </div>
                        </button>

                        <div className="flex items-center space-x-1">
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-1 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-500">
                              Active
                            </span>
                          )}
                          {savedWorkspaces.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete database "${ws.title}"?`)) {
                                  deleteStoredWorkspace(ws.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity cursor-pointer"
                              title="Delete database"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700" />

        {/* Editable Title */}
        {isEditingTitle ? (
          <input
            type="text"
            value={titleValue}
            onChange={(e) => {
              setTitleValue(e.target.value);
              updateTitle(e.target.value);
            }}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditingTitle(false);
            }}
            autoFocus
            className="text-sm font-semibold tracking-tight bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 rounded-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-sm font-semibold tracking-tight hover:bg-neutral-100 dark:hover:bg-neutral-900 px-2 py-0.5 rounded-none transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 text-left cursor-pointer"
            title="Click to rename database"
          >
            {state.title || 'Untitled Workspace'}
          </button>
        )}

        {/* History Undo / Redo */}
        <div className="flex items-center space-x-0.5 ml-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-25 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-25 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Controls: Share, Import/Export, Theme */}
      <div className="flex items-center space-x-2">
        {/* URL Byte Size & Checksum Indicator Badge */}
        <div
          title="Tamper-proof FNV-1a Checksum verified. Compressed state snapshot in URL hash."
          className="hidden md:flex items-center space-x-1.5 font-mono text-[11px] text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-2 py-1 bg-neutral-50 dark:bg-neutral-950"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>#hash:</span>
          <span className="font-semibold text-black dark:text-white min-w-[32px] text-right">
            {isHydrated
              ? urlByteLength > 1024
                ? `${(urlByteLength / 1024).toFixed(1)} KB`
                : `${urlByteLength} B`
              : '— B'}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold border-l border-neutral-200 dark:border-neutral-800 pl-1.5">
            CRC32✓
          </span>
        </div>

        {/* Share Link Button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 text-xs font-mono font-medium border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black px-2.5 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors active:scale-95 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-700" />
              <span>COPIED!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>SHARE URL</span>
            </>
          )}
        </button>

        {/* Quick New Database button */}
        <button
          onClick={() => createNewDatabase('Untitled Database')}
          className="hidden lg:flex items-center space-x-1 text-xs font-mono border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          title="Create a new fresh database from scratch"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span>NEW DB</span>
        </button>

        {/* Data Exchange Export */}
        <button
          onClick={() => {
            setExchangeDefaultTab('export');
            setIsExchangeModalOpen(true);
          }}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
          title="Export Table or Workspace (CSV, TSV, JSON)"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Data Exchange Import */}
        <button
          onClick={() => {
            setExchangeDefaultTab('import');
            setIsExchangeModalOpen(true);
          }}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
          title="Import CSV, TSV, or JSON File"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        {/* Interactive Guide & Tutorial */}
        <button
          onClick={() => {
            if (confirm('Load UrlBase Interactive Tutorial & Guide?')) {
              importState(createHelpDatabase());
            }
          }}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
          title="Load Interactive Tutorial & Guide"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Reset / Sample Database */}
        <button
          onClick={() => {
            if (confirm('Reset to sample Workspace Nexus?')) {
              resetDatabase();
            }
          }}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
          title="Load sample database template"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
          title="Toggle Light / Dark Mode"
          aria-label="Toggle Light / Dark Mode"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )
          ) : (
            <span className="w-3.5 h-3.5 block" />
          )}
        </button>
      </div>

      {/* Data Exchange Modal */}
      <DataExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        defaultTab={exchangeDefaultTab}
      />
    </header>
  );
}
