'use client';

import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Field, FieldType } from '../types/database';
import {
  Settings,
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Type,
  Hash,
  ListFilter,
  CheckSquare,
  Calendar,
  Tags,
  Globe,
} from 'lucide-react';

interface FieldConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  field?: Field;
}

interface FieldFormProps {
  tableId: string;
  field?: Field;
  onClose: () => void;
}

function FieldConfigForm({ tableId, field, onClose }: FieldFormProps) {
  const { state, addField, updateField, deleteField } = useDatabase();
  const isEditing = Boolean(field);

  const [name, setName] = useState(field?.name || '');
  const [type, setType] = useState<FieldType>(field?.type || 'text');
  const [options, setOptions] = useState<string[]>(
    field?.options || ['Todo', 'In Progress', 'Done']
  );
  const [newOption, setNewOption] = useState('');

  const defaultRelationTableId =
    field?.relationTableId ||
    state.tables.find((t) => t.id !== tableId)?.id ||
    state.tables[0]?.id ||
    '';

  const [relationTableId, setRelationTableId] = useState(defaultRelationTableId);
  const targetTable = state.tables.find((t) => t.id === relationTableId);

  const [relationDisplayFieldId, setRelationDisplayFieldId] = useState(
    field?.relationDisplayFieldId || targetTable?.fields[0]?.id || ''
  );

  const handleSave = () => {
    if (!name.trim()) return;

    const payload: Omit<Field, 'id'> = {
      name: name.trim(),
      type,
    };

    if (type === 'select' || type === 'multi_select') {
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

  const availableTypes: { type: FieldType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
    { type: 'number', label: 'Number', icon: <Hash className="w-3.5 h-3.5" /> },
    { type: 'date', label: 'Date', icon: <Calendar className="w-3.5 h-3.5" /> },
    { type: 'select', label: 'Select', icon: <ListFilter className="w-3.5 h-3.5" /> },
    { type: 'multi_select', label: 'Multi-Select', icon: <Tags className="w-3.5 h-3.5" /> },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { type: 'url', label: 'URL', icon: <Globe className="w-3.5 h-3.5" /> },
    { type: 'relation', label: 'Link to Table', icon: <LinkIcon className="w-3.5 h-3.5" /> },
  ];

  return (
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
            placeholder="e.g. Due Date, Project Name, Status..."
            className="w-full text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-3 py-2 outline-none focus:border-black dark:focus:border-white font-sans"
            autoFocus
          />
        </div>

        {/* Type Selector Grid */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            Data Type
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {availableTypes.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setType(item.type)}
                className={`flex items-center space-x-2 px-3 py-2 border transition-colors cursor-pointer ${
                  type === item.type
                    ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options for Select or Multi-Select */}
        {(type === 'select' || type === 'multi_select') && (
          <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
            <label className="block text-[11px] font-mono uppercase text-neutral-500">
              {type === 'multi_select' ? 'Tag Options' : 'Select Options'}
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
                    className="text-neutral-400 hover:text-red-500 cursor-pointer"
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
                className="px-2.5 py-1 text-xs border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-mono cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Relational Link to Table configuration */}
        {type === 'relation' && (
          <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-500 mb-1">
                Link to Table
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
            className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 font-mono cursor-pointer"
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
            className="px-3 py-1.5 text-xs font-mono border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs font-mono border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold disabled:opacity-40 cursor-pointer"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

export function FieldConfigModal({ isOpen, onClose, tableId, field }: FieldConfigModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <FieldConfigForm
        key={field ? field.id : 'new-field'}
        tableId={tableId}
        field={field}
        onClose={onClose}
      />
    </div>
  );
}
