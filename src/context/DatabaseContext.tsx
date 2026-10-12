'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { DatabaseState, Table, RecordRow, Field, ViewConfig, ViewType } from '../types/database';
import { serializeStateToHash, deserializeHashToState } from '../lib/codec';
import { saveWorkspaceToIDB, loadWorkspaceFromIDB } from '../lib/storage';
import { initialDatabaseState } from '../lib/initialData';

interface CollisionState {
  isOpen: boolean;
  incomingState: DatabaseState | null;
}

interface DatabaseContextValue {
  state: DatabaseState;
  activeTable: Table;
  activeView: ViewConfig;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  updateTitle: (title: string) => void;
  // Tables
  addTable: (name?: string) => void;
  deleteTable: (tableId: string) => void;
  renameTable: (tableId: string, name: string) => void;
  // Views
  setActiveViewId: (viewId: string) => void;
  addView: (tableId: string, type: ViewType, name?: string) => void;
  deleteView: (viewId: string) => void;
  updateViewConfig: (viewId: string, updates: Partial<ViewConfig>) => void;
  // Fields / Columns
  addField: (tableId: string, field: Omit<Field, 'id'>) => void;
  updateField: (tableId: string, fieldId: string, updates: Partial<Field>) => void;
  deleteField: (tableId: string, fieldId: string) => void;
  reorderFields: (tableId: string, sourceIndex: number, destIndex: number) => void;
  // Rows / Records
  addRow: (tableId: string, initialValues?: Partial<RecordRow>) => string;
  updateCell: (tableId: string, rowId: string, fieldId: string, value: any, isDirectTyping?: boolean) => void;
  deleteRow: (tableId: string, rowId: string) => void;
  // Collision modal handling
  collision: CollisionState;
  resolveCollision: (action: 'replace' | 'import' | 'discard') => void;
  // Global Import / Export / Reset
  importState: (incoming: DatabaseState) => void;
  exportStateJson: () => void;
  resetDatabase: () => void;
  // Url sharing stats
  urlByteLength: number;
  isHydrated: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DatabaseState>(initialDatabaseState);
  const [historyStack, setHistoryStack] = useState<DatabaseState[]>([]);
  const [futureStack, setFutureStack] = useState<DatabaseState[]>([]);
  const [collision, setCollision] = useState<CollisionState>({ isOpen: false, incomingState: null });
  const [urlByteLength, setUrlByteLength] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // Helper to commit state with undo stack
  const commitState = useCallback((newState: DatabaseState, pushToHistory = true) => {
    if (pushToHistory) {
      setHistoryStack((prev) => [...prev.slice(-40), stateRef.current]);
      setFutureStack([]);
    }
    setState(newState);
  }, []);

  // Update URL hash and persist to storage
  const syncToUrlAndStorage = useCallback(async (currentState: DatabaseState, isStructural = false) => {
    try {
      const hashStr = await serializeStateToHash(currentState);
      setUrlByteLength(hashStr.length);
      saveWorkspaceToIDB(currentState);

      if (typeof window !== 'undefined') {
        const fullHash = `#${hashStr}`;
        if (isStructural) {
          window.history.pushState(null, '', fullHash);
        } else {
          window.history.replaceState(null, '', fullHash);
        }
      }
    } catch (e) {
      console.error('Error syncing state:', e);
    }
  }, []);

  // Structural edits trigger pushState immediately
  const handleStructuralChange = useCallback(
    (newState: DatabaseState) => {
      commitState(newState, true);
      syncToUrlAndStorage(newState, true);
    },
    [commitState, syncToUrlAndStorage]
  );

  // Cell typing uses replaceState and debounces pushState after 1500ms
  const handleCellTypingChange = useCallback(
    (newState: DatabaseState, isDirectTyping = false) => {
      if (!isDirectTyping) {
        handleStructuralChange(newState);
        return;
      }

      // Commit without adding a separate undo frame for every keystroke
      setState(newState);
      syncToUrlAndStorage(newState, false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        // Milestone reached after 1500ms
        setHistoryStack((prev) => [...prev.slice(-40), stateRef.current]);
        setFutureStack([]);
        syncToUrlAndStorage(stateRef.current, true);
      }, 1500);
    },
    [handleStructuralChange, syncToUrlAndStorage]
  );

  // Initial Hydration & Collision detection
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    async function init() {
      const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
      const localState = await loadWorkspaceFromIDB();

      if (currentHash && currentHash.includes('data=')) {
        const sharedState = await deserializeHashToState(currentHash);
        if (sharedState) {
          if (localState && JSON.stringify(localState.tables) !== JSON.stringify(sharedState.tables)) {
            // Collision between existing local workspace and shared link
            setCollision({
              isOpen: true,
              incomingState: sharedState,
            });
            setState(localState);
            serializeStateToHash(localState).then((h) => setUrlByteLength(h.length));
            return;
          } else {
            // No local conflict, load shared state directly
            setState(sharedState);
            saveWorkspaceToIDB(sharedState);
            serializeStateToHash(sharedState).then((h) => setUrlByteLength(h.length));
            return;
          }
        }
      }

      // No hash or shared state failed; fallback to local or initial
      if (localState) {
        setState(localState);
        serializeStateToHash(localState).then((h) => {
          setUrlByteLength(h.length);
          if (typeof window !== 'undefined' && !window.location.hash) {
            window.history.replaceState(null, '', `#${h}`);
          }
        });
      } else {
        setState(initialDatabaseState);
        serializeStateToHash(initialDatabaseState).then((h) => {
          setUrlByteLength(h.length);
          if (typeof window !== 'undefined' && !window.location.hash) {
            window.history.replaceState(null, '', `#${h}`);
          }
        });
        saveWorkspaceToIDB(initialDatabaseState);
      }
    }

    init().finally(() => {
      setIsHydrated(true);
    });

    // Listen to browser Back/Forward (popstate)
    const handlePopState = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('data=')) {
        const fromHash = await deserializeHashToState(hash);
        if (fromHash) {
          setState(fromHash);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    const newHistory = historyStack.slice(0, -1);
    setFutureStack((prev) => [stateRef.current, ...prev]);
    setHistoryStack(newHistory);
    setState(previous);
    syncToUrlAndStorage(previous, false);
  }, [historyStack, syncToUrlAndStorage]);

  const redo = useCallback(() => {
    if (futureStack.length === 0) return;
    const next = futureStack[0];
    const newFuture = futureStack.slice(1);
    setHistoryStack((prev) => [...prev, stateRef.current]);
    setFutureStack(newFuture);
    setState(next);
    syncToUrlAndStorage(next, false);
  }, [futureStack, syncToUrlAndStorage]);

  // Global Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Actions
  const updateTitle = (title: string) => {
    const next = { ...stateRef.current, title };
    handleCellTypingChange(next, true);
  };

  const addTable = (name?: string) => {
    const tableId = `t_${Date.now()}`;
    const newTable: Table = {
      id: tableId,
      name: name || `Table ${stateRef.current.tables.length + 1}`,
      fields: [
        { id: `f_name_${Date.now()}`, name: 'Name', type: 'text' },
        { id: `f_notes_${Date.now()}`, name: 'Notes', type: 'text' },
      ],
      rows: [
        { id: `r_1_${Date.now()}` },
      ],
    };

    const newView: ViewConfig = {
      id: `v_${tableId}_grid`,
      tableId: tableId,
      name: `${newTable.name} Grid`,
      type: 'table',
    };

    const next: DatabaseState = {
      ...stateRef.current,
      tables: [...stateRef.current.tables, newTable],
      views: [...stateRef.current.views, newView],
      activeViewId: newView.id,
    };
    handleStructuralChange(next);
  };

  const deleteTable = (tableId: string) => {
    if (stateRef.current.tables.length <= 1) return;
    const remainingTables = stateRef.current.tables.filter((t) => t.id !== tableId);
    const remainingViews = stateRef.current.views.filter((v) => v.tableId !== tableId);
    const activeViewValid = remainingViews.some((v) => v.id === stateRef.current.activeViewId);
    const nextActiveViewId = activeViewValid ? stateRef.current.activeViewId : remainingViews[0].id;

    const next: DatabaseState = {
      ...stateRef.current,
      tables: remainingTables,
      views: remainingViews,
      activeViewId: nextActiveViewId,
    };
    handleStructuralChange(next);
  };

  const renameTable = (tableId: string, name: string) => {
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => (t.id === tableId ? { ...t, name } : t)),
    };
    handleStructuralChange(next);
  };

  const setActiveViewId = (viewId: string) => {
    setState((prev) => ({ ...prev, activeViewId: viewId }));
  };

  const addView = (tableId: string, type: ViewType, name?: string) => {
    const viewId = `v_${Date.now()}`;
    const targetTable = stateRef.current.tables.find((t) => t.id === tableId);
    const viewName = name || `${targetTable?.name || 'Table'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    // If kanban or card, default groupByFieldId to first select or relation field if available
    let groupByFieldId: string | undefined = undefined;
    if (type === 'kanban' || type === 'card') {
      const selectField = targetTable?.fields.find((f) => f.type === 'select' || f.type === 'relation');
      if (selectField) {
        groupByFieldId = selectField.id;
      }
    }

    const newView: ViewConfig = {
      id: viewId,
      tableId,
      name: viewName,
      type,
      groupByFieldId,
    };

    const next: DatabaseState = {
      ...stateRef.current,
      views: [...stateRef.current.views, newView],
      activeViewId: viewId,
    };
    handleStructuralChange(next);
  };

  const deleteView = (viewId: string) => {
    if (stateRef.current.views.length <= 1) return;
    const remainingViews = stateRef.current.views.filter((v) => v.id !== viewId);
    const nextActive = stateRef.current.activeViewId === viewId ? remainingViews[0].id : stateRef.current.activeViewId;
    const next: DatabaseState = {
      ...stateRef.current,
      views: remainingViews,
      activeViewId: nextActive,
    };
    handleStructuralChange(next);
  };

  const updateViewConfig = (viewId: string, updates: Partial<ViewConfig>) => {
    const next: DatabaseState = {
      ...stateRef.current,
      views: stateRef.current.views.map((v) => (v.id === viewId ? { ...v, ...updates } : v)),
    };
    handleStructuralChange(next);
  };

  const addField = (tableId: string, fieldData: Omit<Field, 'id'>) => {
    const fieldId = `f_${Date.now()}`;
    const newField: Field = { ...fieldData, id: fieldId };
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          fields: [...t.fields, newField],
        };
      }),
    };
    handleStructuralChange(next);
  };

  const updateField = (tableId: string, fieldId: string, updates: Partial<Field>) => {
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          fields: t.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
        };
      }),
    };
    handleStructuralChange(next);
  };

  const deleteField = (tableId: string, fieldId: string) => {
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          fields: t.fields.filter((f) => f.id !== fieldId),
          rows: t.rows.map((row) => {
            const copy = { ...row };
            delete copy[fieldId];
            return copy;
          }),
        };
      }),
    };
    handleStructuralChange(next);
  };

  const reorderFields = (tableId: string, sourceIndex: number, destIndex: number) => {
    const table = stateRef.current.tables.find((t) => t.id === tableId);
    if (!table) return;
    const newFields = [...table.fields];
    const [removed] = newFields.splice(sourceIndex, 1);
    newFields.splice(destIndex, 0, removed);

    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => (t.id === tableId ? { ...t, fields: newFields } : t)),
    };
    handleStructuralChange(next);
  };

  const addRow = (tableId: string, initialValues: Partial<RecordRow> = {}) => {
    const rowId = `r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRow: RecordRow = { id: rowId, ...initialValues };
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          rows: [...t.rows, newRow],
        };
      }),
    };
    handleStructuralChange(next);
    return rowId;
  };

  const updateCell = (tableId: string, rowId: string, fieldId: string, value: any, isDirectTyping = false) => {
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          rows: t.rows.map((r) => {
            if (r.id !== rowId) return r;
            return {
              ...r,
              [fieldId]: value,
            };
          }),
        };
      }),
    };
    handleCellTypingChange(next, isDirectTyping);
  };

  const deleteRow = (tableId: string, rowId: string) => {
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          rows: t.rows.filter((r) => r.id !== rowId),
        };
      }),
    };
    handleStructuralChange(next);
  };

  const resolveCollision = (action: 'replace' | 'import' | 'discard') => {
    if (!collision.incomingState) {
      setCollision({ isOpen: false, incomingState: null });
      return;
    }

    if (action === 'replace') {
      const incoming = collision.incomingState;
      handleStructuralChange(incoming);
      setCollision({ isOpen: false, incomingState: null });
    } else if (action === 'import') {
      const current = stateRef.current;
      const incoming = collision.incomingState;
      // Append incoming tables and views with unique IDs if collision exists
      const mergedTables = [...current.tables];
      const mergedViews = [...current.views];

      incoming.tables.forEach((inTable) => {
        const idTaken = mergedTables.some((t) => t.id === inTable.id);
        const targetId = idTaken ? `${inTable.id}_imp_${Date.now()}` : inTable.id;
        const newT: Table = {
          ...inTable,
          id: targetId,
          name: idTaken ? `${inTable.name} (Imported)` : inTable.name,
        };
        mergedTables.push(newT);
      });

      incoming.views.forEach((inView) => {
        const viewIdTaken = mergedViews.some((v) => v.id === inView.id);
        mergedViews.push({
          ...inView,
          id: viewIdTaken ? `${inView.id}_imp` : inView.id,
        });
      });

      const next: DatabaseState = {
        ...current,
        tables: mergedTables,
        views: mergedViews,
      };
      handleStructuralChange(next);
      setCollision({ isOpen: false, incomingState: null });
    } else {
      // Discard shared and keep existing local workspace
      setCollision({ isOpen: false, incomingState: null });
      syncToUrlAndStorage(stateRef.current, true);
    }
  };

  const importState = (incoming: DatabaseState) => {
    handleStructuralChange(incoming);
  };

  const exportStateJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(stateRef.current, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${stateRef.current.title.toLowerCase().replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const resetDatabase = () => {
    handleStructuralChange(initialDatabaseState);
  };

  // Find active table and view
  const activeView =
    state.views.find((v) => v.id === state.activeViewId) ||
    state.views[0] || {
      id: 'default',
      tableId: state.tables[0]?.id || 'default',
      name: 'Default',
      type: 'table' as ViewType,
    };

  const activeTable =
    state.tables.find((t) => t.id === activeView.tableId) ||
    state.tables[0] || {
      id: 'default',
      name: 'Default',
      fields: [],
      rows: [],
    };

  return (
    <DatabaseContext.Provider
      value={{
        state,
        activeTable,
        activeView,
        canUndo: historyStack.length > 0,
        canRedo: futureStack.length > 0,
        undo,
        redo,
        updateTitle,
        addTable,
        deleteTable,
        renameTable,
        setActiveViewId,
        addView,
        deleteView,
        updateViewConfig,
        addField,
        updateField,
        deleteField,
        reorderFields,
        addRow,
        updateCell,
        deleteRow,
        collision,
        resolveCollision,
        importState,
        exportStateJson,
        resetDatabase,
        urlByteLength,
        isHydrated,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
