import { openDB, IDBPDatabase } from 'idb';
import { ImageHumanStructure } from '../../ai/human/schema';

const DB_NAME = 'PhotoZOD_HumanCache';
const DB_VERSION = 1;
const STORE_NAME = 'humans';

class HumanStore {
  private dbPromise: Promise<IDBPDatabase | null>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'assetId' });
        }
      },
    }).catch(err => {
      console.warn('[HumanStore] Failed to open IndexedDB:', err);
      return null;
    });
  }

  async set(assetId: string, data: ImageHumanStructure): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (db) {
        await db.put(STORE_NAME, data);
      }
    } catch (err) {
      console.warn(`[HumanStore] Failed to set cache for ${assetId}:`, err);
    }
  }

  async get(assetId: string): Promise<ImageHumanStructure | undefined> {
    try {
      const db = await this.dbPromise;
      if (db) {
        return await db.get(STORE_NAME, assetId);
      }
    } catch (err) {
      console.warn(`[HumanStore] Failed to get cache for ${assetId}:`, err);
    }
    return undefined;
  }
}

const humanStore = new HumanStore();

export async function storeHumanData(assetId: string, data: ImageHumanStructure): Promise<void> {
  await humanStore.set(assetId, data);
}

export async function getHumanData(assetId: string): Promise<ImageHumanStructure | undefined> {
  return await humanStore.get(assetId);
}
