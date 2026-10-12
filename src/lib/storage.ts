import { DatabaseState } from '../types/database';

const DB_NAME = 'UrlBaseDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';
const ACTIVE_KEY = 'active_workspace';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkspaceToIDB(state: DatabaseState): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, ACTIVE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback to localStorage
    try {
      localStorage.setItem('urlbase_fallback_state', JSON.stringify(state));
    } catch (e) {
      console.warn('Fallback saving failed:', e);
    }
  }
}

export async function loadWorkspaceFromIDB(): Promise<DatabaseState | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ACTIVE_KEY);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as DatabaseState);
        } else {
          resolve(loadFallback());
        }
      };
      req.onerror = () => resolve(loadFallback());
    });
  } catch {
    return loadFallback();
  }
}

function loadFallback(): DatabaseState | null {
  try {
    const str = localStorage.getItem('urlbase_fallback_state');
    if (str) return JSON.parse(str) as DatabaseState;
  } catch {}
  return null;
}
