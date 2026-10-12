'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

interface SafeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  count?: number;
}

export function SafeDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Records',
  description,
  count = 1,
}: SafeDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-sm bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 shadow-2xl p-5">
        <div className="flex items-start space-x-3">
          <div className="p-2 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-mono font-bold uppercase tracking-tight text-black dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              {description ||
                `Are you sure you want to delete ${
                  count === 1 ? 'this record' : `${count} selected records`
                }? You can undo this action with Ctrl+Z.`}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end space-x-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-mono border border-red-600 bg-red-600 text-white font-semibold hover:bg-red-700 cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
