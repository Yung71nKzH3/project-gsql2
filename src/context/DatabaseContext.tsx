'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { DatabaseState, Table, RecordRow, Field, ViewConfig, ViewType, WorkspaceMeta, CellValue } from '../types/database';
import { serializeStateToHash, deserializeHashToState, deserializeHashWithVerification } from '../lib/codec';
import {
  saveWorkspaceToIDB,
  loadWorkspaceFromIDB,
  listWorkspacesFromIDB,
  deleteWorkspaceFromIDB,
} from '../lib/storage';
import { initialDatabaseState, createBlankDatabase } from '../lib/initialData';

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
  // Multi-workspace management
  savedWorkspaces: WorkspaceMeta[];
  refreshSavedWorkspaces: () => Promise<void>;
  createNewDatabase: (title?: string) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  deleteStoredWorkspace: (workspaceId: string) => Promise<void>;
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
  updateCell: (tableId: string, rowId: string, fieldId: string, value: CellValue, isDirectTyping?: boolean) => void;
  deleteRow: (tableId: string, rowId: string) => void;
  duplicateRow: (tableId: string, rowId: string) => string;
  bulkDeleteRows: (tableId: string, rowIds: string[]) => void;
  bulkDuplicateRows: (tableId: string, rowIds: string[]) => string[];
  // Collision modal handling
  collision: CollisionState;
  resolveCollision: (action: 'replace' | 'import' | 'discard') => void;
  // Global Import / Export / Reset
  importState: (incoming: DatabaseState) => void;
  exportStateJson: () => void;
  resetDatabase: () => void;
  // Url sharing stats & validation
  urlByteLength: number;
  isHydrated: boolean;
  urlTruncationWarning: boolean;
  dismissTruncationWarning: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DatabaseState>(initialDatabaseState);
  const [savedWorkspaces, setSavedWorkspaces] = useState<WorkspaceMeta[]>([]);
  const [historyStack, setHistoryStack] = useState<DatabaseState[]>([]);
  const [futureStack, setFutureStack] = useState<DatabaseState[]>([]);
  const [collision, setCollision] = useState<CollisionState>({ isOpen: false, incomingState: null });
  const [urlByteLength, setUrlByteLength] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [urlTruncationWarning, setUrlTruncationWarning] = useState<boolean>(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  const refreshSavedWorkspaces = useCallback(async () => {
    const list = await listWorkspacesFromIDB();
    setSavedWorkspaces(list);
  }, []);

  // Helper to commit state with undo stack
  const commitState = useCallback((newState: DatabaseState, pushToHistory = true) => {
    if (pushToHistory) {
      setHistoryStack((prev) => [...prev.slice(-40), stateRef.current]);
      setFutureStack([]);
    }
    stateRef.current = newState;
    setState(newState);
  }, []);

  // Update URL hash and persist to storage
  const syncToUrlAndStorage = useCallback(
    async (currentState: DatabaseState, isStructural = false) => {
      try {
        const hashStr = await serializeStateToHash(currentState);
        setUrlByteLength(hashStr.length);
        await saveWorkspaceToIDB(currentState);
        refreshSavedWorkspaces();

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
    },
    [refreshSavedWorkspaces]
  );

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
        const verification = await deserializeHashWithVerification(currentHash);
        if (verification.isTruncated && !verification.state) {
          setUrlTruncationWarning(true);
        }

        const sharedState = verification.state;
        if (sharedState) {
          if (
            localState &&
            localState.id !== sharedState.id &&
            JSON.stringify(localState.tables) !== JSON.stringify(sharedState.tables)
          ) {
            // Collision between existing local workspace and incoming shared link
            setCollision({
              isOpen: true,
              incomingState: sharedState,
            });
            setState(localState);
            serializeStateToHash(localState).then((h) => setUrlByteLength(h.length));
            await refreshSavedWorkspaces();
            return;
          } else {
            // Load shared state directly
            setState(sharedState);
            await saveWorkspaceToIDB(sharedState);
            serializeStateToHash(sharedState).then((h) => setUrlByteLength(h.length));
            await refreshSavedWorkspaces();
            return;
          }
        }
      }

      // No hash: load last saved workspace from IDB, or seed default
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
        await saveWorkspaceToIDB(initialDatabaseState);
      }

      await refreshSavedWorkspaces();
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
  }, [refreshSavedWorkspaces]);

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

  // Multi-workspace operations
  const createNewDatabase = (title = 'Untitled Database') => {
    const blank = createBlankDatabase(title);
    setHistoryStack([]);
    setFutureStack([]);
    handleStructuralChange(blank);
  };

  const switchWorkspace = async (workspaceId: string) => {
    const target = await loadWorkspaceFromIDB(workspaceId);
    if (target) {
      setHistoryStack([]);
      setFutureStack([]);
      handleStructuralChange(target);
    }
  };

  const deleteStoredWorkspace = async (workspaceId: string) => {
    await deleteWorkspaceFromIDB(workspaceId);
    await refreshSavedWorkspaces();
    // If deleted currently active, switch to another or blank
    if (stateRef.current.id === workspaceId) {
      const remaining = savedWorkspaces.filter((w) => w.id !== workspaceId);
      if (remaining.length > 0) {
        await switchWorkspace(remaining[0].id);
      } else {
        createNewDatabase();
      }
    }
  };

  // Actions
  const updateTitle = (title: string) => {
    const next = { ...stateRef.current, title, updatedAt: Date.now() };
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
      rows: [{ id: `r_1_${Date.now()}` }],
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
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
    };
    handleStructuralChange(next);
  };

  const renameTable = (tableId: string, name: string) => {
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => (t.id === tableId ? { ...t, name } : t)),
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
    };
    handleStructuralChange(next);
  };

  const updateViewConfig = (viewId: string, updates: Partial<ViewConfig>) => {
    const next: DatabaseState = {
      ...stateRef.current,
      views: stateRef.current.views.map((v) => (v.id === viewId ? { ...v, ...updates } : v)),
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
    };
    handleStructuralChange(next);
    return rowId;
  };

  const updateCell = (tableId: string, rowId: string, fieldId: string, value: CellValue, isDirectTyping = false) => {
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
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
    };
    handleStructuralChange(next);
  };

  const duplicateRow = (tableId: string, rowId: string) => {
    const table = stateRef.current.tables.find((t) => t.id === tableId);
    if (!table) return '';
    const original = table.rows.find((r) => r.id === rowId);
    if (!original) return '';

    const newId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const duplicated: RecordRow = {
      ...original,
      id: newId,
    };

    const originalIndex = table.rows.findIndex((r) => r.id === rowId);
    const newRows = [...table.rows];
    newRows.splice(originalIndex + 1, 0, duplicated);

    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          rows: newRows,
        };
      }),
      updatedAt: Date.now(),
    };
    handleStructuralChange(next);
    return newId;
  };

  const bulkDeleteRows = (tableId: string, rowIds: string[]) => {
    const idSet = new Set(rowIds);
    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          rows: t.rows.filter((r) => !idSet.has(r.id)),
        };
      }),
      updatedAt: Date.now(),
    };
    handleStructuralChange(next);
  };

  const bulkDuplicateRows = (tableId: string, rowIds: string[]) => {
    const table = stateRef.current.tables.find((t) => t.id === tableId);
    if (!table) return [];
    const idSet = new Set(rowIds);
    const duplicates: RecordRow[] = [];
    const createdIds: string[] = [];

    table.rows.forEach((r) => {
      if (idSet.has(r.id)) {
        const newId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        createdIds.push(newId);
        duplicates.push({
          ...r,
          id: newId,
        });
      }
    });

    const next: DatabaseState = {
      ...stateRef.current,
      tables: stateRef.current.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          rows: [...t.rows, ...duplicates],
        };
      }),
      updatedAt: Date.now(),
    };
    handleStructuralChange(next);
    return createdIds;
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
        updatedAt: Date.now(),
      };
      handleStructuralChange(next);
      setCollision({ isOpen: false, incomingState: null });
    } else {
      setCollision({ isOpen: false, incomingState: null });
      syncToUrlAndStorage(stateRef.current, true);
    }
  };

  const importState = (incoming: DatabaseState) => {
    handleStructuralChange({
      ...incoming,
      id: incoming.id || `ws_imp_${Date.now()}`,
      updatedAt: Date.now(),
    });
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
        savedWorkspaces,
        refreshSavedWorkspaces,
        createNewDatabase,
        switchWorkspace,
        deleteStoredWorkspace,
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
        duplicateRow,
        bulkDeleteRows,
        bulkDuplicateRows,
        collision,
        resolveCollision,
        importState,
        exportStateJson,
        resetDatabase,
        urlByteLength,
        isHydrated,
        urlTruncationWarning,
        dismissTruncationWarning: () => setUrlTruncationWarning(false),
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
