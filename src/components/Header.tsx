'use client';

import React, { useState } from 'react';
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
  Plus,
  RotateCcw,
  Check,
  Database as DbIcon,
  Sparkles,
} from 'lucide-react';

export function Header() {
  const {
    state,
    updateTitle,
    canUndo,
    canRedo,
    undo,
    redo,
    addTable,
    exportStateJson,
    importState,
    resetDatabase,
    urlByteLength,
    isHydrated,
  } = useDatabase();
  const { theme, toggleTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(state.title);

  // Sync title value if external updates occur
  React.useEffect(() => {
    setTitleValue(state.title);
  }, [state.title]);

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

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.version && Array.isArray(parsed.tables)) {
          importState(parsed);
        } else {
          alert('Invalid UrlBase JSON file.');
        }
      } catch {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-4 flex items-center justify-between select-none">
      {/* Brand & Database Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 font-mono text-xs font-semibold uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded-none border border-black dark:border-white">
          <DbIcon className="w-3.5 h-3.5" />
          <span>UrlBase</span>
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
            className="text-sm font-semibold tracking-tight hover:bg-neutral-100 dark:hover:bg-neutral-900 px-2 py-0.5 rounded-none transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 text-left"
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
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-25 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-25 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Controls: Share, Import/Export, Theme */}
      <div className="flex items-center space-x-2">
        {/* URL Byte Size Indicator Badge */}
        <div
          title="Total compressed state size packed in URL hash"
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
        </div>

        {/* Share Link Button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 text-xs font-mono font-medium border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black px-2.5 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors active:scale-95"
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

        {/* New Table */}
        <button
          onClick={() => addTable()}
          className="hidden sm:flex items-center space-x-1 text-xs font-mono border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          title="Add new relational table"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>NEW TABLE</span>
        </button>

        {/* JSON Export */}
        <button
          onClick={exportStateJson}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300"
          title="Export Database to JSON file"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* JSON Import */}
        <label
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
          title="Import Database from JSON file"
        >
          <Upload className="w-3.5 h-3.5" />
          <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
        </label>

        {/* Reset Database */}
        <button
          onClick={() => {
            if (confirm('Reset workspace to sample database?')) {
              resetDatabase();
            }
          }}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300"
          title="Reset to default workspace"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
