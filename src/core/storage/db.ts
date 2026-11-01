import { openDB, IDBPDatabase } from 'idb';
import { Asset } from '../dam/types';
import { Entity } from '../entities/schema';

const DB_NAME = 'PhotoZOD_SystemDB';
const DB_VERSION = 1;

export interface SystemRegistry {
  version: string;
  lastOpened: number;
  [key: string]: any;
}

export interface AssetRecord {
  assetId: string;
  metadata: any; // EXIF, derived data
  photocode: string;
  entityLinks: string[];
  state: any; // Pipeline state, culling decisions, seeds
}

class SystemDB {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Assets store
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'assetId' });
        }
        
        // Entities store
        if (!db.objectStoreNames.contains('entities')) {
          db.createObjectStore('entities', { keyPath: 'id' });
        }

        // System store (registry, logs, duplicate groups)
        if (!db.objectStoreNames.contains('system')) {
          db.createObjectStore('system');
        }
      },
    });
  }

  async getDB() {
    return this.dbPromise;
  }

  // --- ASSETS ---
  async saveAsset(asset: Asset) {
    const db = await this.dbPromise;
    await db.put('assets', asset);
  }

  async getAsset(assetId: string): Promise<Asset | undefined> {
    const db = await this.dbPromise;
    return await db.get('assets', assetId);
  }

  async getAllAssets(): Promise<Asset[]> {
    const db = await this.dbPromise;
    return await db.getAll('assets');
  }

  async deleteAsset(assetId: string) {
    const db = await this.dbPromise;
    await db.delete('assets', assetId);
  }

  // --- ENTITIES ---
  async saveEntity(entity: Entity) {
    const db = await this.dbPromise;
    await db.put('entities', entity);
  }

  async getEntity(id: string): Promise<Entity | undefined> {
    const db = await this.dbPromise;
    return await db.get('entities', id);
  }

  async getAllEntities(): Promise<Entity[]> {
    const db = await this.dbPromise;
    return await db.getAll('entities');
  }

  async deleteEntity(id: string) {
    const db = await this.dbPromise;
    await db.delete('entities', id);
  }

  // --- SYSTEM ---
  async saveSystemData(key: string, data: any) {
    const db = await this.dbPromise;
    await db.put('system', data, key);
  }

  async getSystemData(key: string): Promise<any> {
    const db = await this.dbPromise;
    return await db.get('system', key);
  }

  // --- TRANSACTIONS ---
  async runTransaction(stores: ('assets' | 'entities' | 'system')[], mode: 'readonly' | 'readwrite', callback: (tx: any) => Promise<void>) {
    const db = await this.dbPromise;
    const tx = db.transaction(stores, mode);
    try {
      await callback(tx);
      await tx.done;
    } catch (error) {
      // Only abort if the transaction is still active
      try {
        tx.abort();
      } catch (e) {
        // Ignore if already aborted or finished
      }
      throw error;
    }
  }
}

export const systemDB = new SystemDB();
