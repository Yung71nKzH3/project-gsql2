'use client';

import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Field, FieldType } from '../types/database';
import { Settings, X, Plus, Trash2, Link as LinkIcon, Type, Hash, ListFilter, CheckSquare } from 'lucide-react';

interface FieldConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  field?: Field; // If editing existing field, or undefined if creating
}

export function FieldConfigModal({ isOpen, onClose, tableId, field }: FieldConfigModalProps) {
  const { state, addField, updateField, deleteField } = useDatabase();

  const isEditing = Boolean(field);
  const [name, setName] = useState(field?.name || '');
  const [type, setType] = useState<FieldType>(field?.type || 'text');
  const [options, setOptions] = useState<string[]>(field?.options || ['Option 1', 'Option 2', 'Option 3']);
  const [newOption, setNewOption] = useState('');
  const [relationTableId, setRelationTableId] = useState(
    field?.relationTableId || state.tables.find((t) => t.id !== tableId)?.id || state.tables[0]?.id || ''
  );
  const [relationDisplayFieldId, setRelationDisplayFieldId] = useState(field?.relationDisplayFieldId || '');

  React.useEffect(() => {
    if (field) {
      setName(field.name);
      setType(field.type);
      setOptions(field.options || ['Option 1', 'Option 2']);
      setRelationTableId(field.relationTableId || state.tables.find((t) => t.id !== tableId)?.id || '');
      setRelationDisplayFieldId(field.relationDisplayFieldId || '');
    } else {
      setName('');
      setType('text');
      setOptions(['Todo', 'In Progress', 'Done']);
      const otherTable = state.tables.find((t) => t.id !== tableId);
      setRelationTableId(otherTable?.id || state.tables[0]?.id || '');
      setRelationDisplayFieldId('');
    }
  }, [field, isOpen, state.tables, tableId]);

  // Set default display field when relation table changes
  const targetTable = state.tables.find((t) => t.id === relationTableId);
  React.useEffect(() => {
    if (type === 'relation' && targetTable && !relationDisplayFieldId) {
      const firstField = targetTable.fields[0];
      if (firstField) setRelationDisplayFieldId(firstField.id);
    }
  }, [relationTableId, type, targetTable, relationDisplayFieldId]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;

    const payload: Omit<Field, 'id'> = {
      name: name.trim(),
      type,
    };

    if (type === 'select') {
      payload.options = options.filter((o) => o.trim().length > 0);
    }

    if (type === 'relation') {
      payload.relationTableId = relationTableId;
      payload.relationDisplayFieldId =
        relationDisplayFieldId || targetTable?.fields[0]?.id || 'f_title';
    }

    if (isEditing && field) {
      updateField(tableId, field.id, payload);
    } else {
      addField(tableId, payload);
    }

    onClose();
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const typeIcons: Record<FieldType, React.ReactNode> = {
    text: <Type className="w-3.5 h-3.5" />,
    number: <Hash className="w-3.5 h-3.5" />,
    select: <ListFilter className="w-3.5 h-3.5" />,
    checkbox: <CheckSquare className="w-3.5 h-3.5" />,
    relation: <LinkIcon className="w-3.5 h-3.5" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <h3 className="text-sm font-bold font-mono tracking-wide uppercase">
              {isEditing ? 'Configure Column' : 'Add Column'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Column Name */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Column Header
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Name, Assignee, Amount..."
              className="w-full text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-3 py-2 outline-none focus:border-black dark:focus:border-white"
              autoFocus
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1">
              Data Type
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {(['text', 'number', 'select', 'checkbox', 'relation'] as FieldType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center space-x-2 px-3 py-2 border transition-colors ${
                    type === t
                      ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  {typeIcons[t]}
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Specific Type Options */}
          {type === 'select' && (
            <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
              <label className="block text-[11px] font-mono uppercase text-neutral-500">
                Select Options
              </label>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center space-x-1 text-xs border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 bg-white dark:bg-black"
                  >
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-1.5 pt-1">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="New option label..."
                  className="flex-1 text-xs bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-2 py-1 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-2.5 py-1 text-xs border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-mono"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Relational Foreign Key configuration */}
          {type === 'relation' && (
            <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                  Foreign Key Target Table
                </label>
                <select
                  value={relationTableId}
                  onChange={(e) => {
                    setRelationTableId(e.target.value);
                    const t = state.tables.find((item) => item.id === e.target.value);
                    if (t?.fields[0]) setRelationDisplayFieldId(t.fields[0].id);
                  }}
                  className="w-full text-xs bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 outline-none font-mono"
                >
                  {state.tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.rows.length} records)
                    </option>
                  ))}
                </select>
              </div>

              {targetTable && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                    Label Display Field
                  </label>
                  <select
                    value={relationDisplayFieldId}
                    onChange={(e) => setRelationDisplayFieldId(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 outline-none font-mono"
                  >
                    {targetTable.fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          {isEditing && field ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete column "${field.name}"? Data in this column will be removed.`)) {
                  deleteField(tableId, field.id);
                  onClose();
                }
              }}
              className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 font-mono"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE COLUMN</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-1.5 text-xs font-mono border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold disabled:opacity-40"
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
