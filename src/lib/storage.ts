import { DatabaseState, WorkspaceMeta } from '../types/database';

const DB_NAME = 'UrlBaseDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';
const ACTIVE_KEY = 'active_workspace_id';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a database state into IndexedDB by its unique workspace ID
 */
export async function saveWorkspaceToIDB(state: DatabaseState): Promise<void> {
  const wsId = state.id || 'default_workspace';
  const stateWithMeta: DatabaseState = {
    ...state,
    id: wsId,
    updatedAt: Date.now(),
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(stateWithMeta);
      req.onsuccess = () => {
        try {
          localStorage.setItem(ACTIVE_KEY, wsId);
        } catch {}
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    try {
      localStorage.setItem(`urlbase_ws_${wsId}`, JSON.stringify(stateWithMeta));
      localStorage.setItem(ACTIVE_KEY, wsId);
    } catch (e) {
      console.warn('Fallback saving failed:', e);
    }
  }
}

/**
 * Loads a specific workspace by ID or the active one
 */
export async function loadWorkspaceFromIDB(workspaceId?: string): Promise<DatabaseState | null> {
  try {
    const targetId = workspaceId || (typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_KEY) : null);
    if (!targetId) return loadFallback();

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(targetId);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as DatabaseState);
        } else {
          resolve(loadFallback(targetId));
        }
      };
      req.onerror = () => resolve(loadFallback(targetId));
    });
  } catch {
    return loadFallback(workspaceId);
  }
}

/**
 * Lists all stored databases
 */
export async function listWorkspacesFromIDB(): Promise<WorkspaceMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as DatabaseState[];
        const metas: WorkspaceMeta[] = list.map((ws) => ({
          id: ws.id || 'default_workspace',
          title: ws.title || 'Untitled Workspace',
          tableCount: ws.tables?.length || 0,
          rowCount: ws.tables?.reduce((sum, t) => sum + (t.rows?.length || 0), 0) || 0,
          updatedAt: ws.updatedAt || Date.now(),
        }));
        metas.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(metas);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Deletes a workspace from IndexedDB
 */
export async function deleteWorkspaceFromIDB(workspaceId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(workspaceId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    try {
      localStorage.removeItem(`urlbase_ws_${workspaceId}`);
    } catch {}
  }
}

function loadFallback(id?: string): DatabaseState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const targetKey = id ? `urlbase_ws_${id}` : 'urlbase_fallback_state';
    const str = localStorage.getItem(targetKey) || localStorage.getItem('urlbase_fallback_state');
    if (str) return JSON.parse(str) as DatabaseState;
  } catch {}
  return null;
}
