'use client';

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { AlertCircle, ArrowRight, Download, X } from 'lucide-react';

export function ImportCollisionModal() {
  const { collision, resolveCollision } = useDatabase();

  if (!collision.isOpen || !collision.incomingState) return null;

  const incoming = collision.incomingState;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-black border border-neutral-400 dark:border-neutral-600 shadow-2xl p-6">
        <div className="flex items-start space-x-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <AlertCircle className="w-5 h-5 text-neutral-800 dark:text-neutral-200 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-mono font-bold tracking-tight uppercase">
              Shared Database Detected
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              You are opening a shared link with workspace{' '}
              <strong className="text-black dark:text-white">"{incoming.title}"</strong> ({incoming.tables.length} tables),
              but an existing local workspace is already active on this device.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {/* Option 1: Load & Replace */}
          <button
            onClick={() => resolveCollision('replace')}
            className="w-full text-left p-3 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-semibold font-mono text-black dark:text-white">
                Load Shared Database
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Replaces current local view with the incoming snapshot.
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
          </button>

          {/* Option 2: Import as new tables */}
          <button
            onClick={() => resolveCollision('import')}
            className="w-full text-left p-3 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-semibold font-mono text-black dark:text-white">
                Import as New Tables
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Appends all tables and views from the link into your current database.
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
          </button>

          {/* Option 3: Discard */}
          <button
            onClick={() => resolveCollision('discard')}
            className="w-full text-left p-3 border border-neutral-200 dark:border-neutral-800 hover:border-red-500 hover:bg-red-50/20 dark:hover:bg-red-950/20 transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-semibold font-mono text-neutral-700 dark:text-neutral-300">
                Discard Shared Link
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Keep your existing local workspace untouched and overwrite the URL.
              </div>
            </div>
            <X className="w-4 h-4 text-neutral-400 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
