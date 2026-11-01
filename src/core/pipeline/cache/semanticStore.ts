import { openDB, IDBPDatabase } from 'idb';
import { SemanticData } from '../../ai/vision/semanticBuilder';

const DB_NAME = 'PhotoZOD_SemanticCache';
const DB_VERSION = 1;
const STORE_NAME = 'semantics';

class SemanticStore {
  private dbPromise: Promise<IDBPDatabase | null>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    }).catch(err => {
      console.warn('[SemanticStore] Failed to open IndexedDB:', err);
      return null;
    });
  }

  async set(id: string, data: SemanticData): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (db) {
        await db.put(STORE_NAME, data);
      }
    } catch (err) {
      console.warn(`[SemanticStore] Failed to set cache for ${id}:`, err);
    }
  }

  async get(id: string): Promise<SemanticData | undefined> {
    try {
      const db = await this.dbPromise;
      if (db) {
        return await db.get(STORE_NAME, id);
      }
    } catch (err) {
      console.warn(`[SemanticStore] Failed to get cache for ${id}:`, err);
    }
    return undefined;
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (db) {
        await db.delete(STORE_NAME, id);
      }
    } catch (err) {
      console.warn(`[SemanticStore] Failed to delete cache for ${id}:`, err);
    }
  }
}

const semanticStore = new SemanticStore();

export async function storeSemantic(id: string, data: SemanticData): Promise<void> {
  await semanticStore.set(id, data);
}

export async function getSemantic(id: string): Promise<SemanticData | undefined> {
  return await semanticStore.get(id);
}

export async function deleteSemantic(id: string): Promise<void> {
  await semanticStore.delete(id);
}
