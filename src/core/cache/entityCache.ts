import { openDB, IDBPDatabase } from 'idb';
import { Entity } from '../entities/schema';

const DB_NAME = 'PhotoZOD_EntityCache_v2';
const DB_VERSION = 1;
const STORE_NAME = 'entities';

class EntityCache {
  // L1: In-memory cache
  private l1Cache: Map<string, Entity> = new Map();
  private l1Order: string[] = []; // For LRU
  private readonly MAX_L1_SIZE = 1000;

  // L2: IndexedDB
  private dbPromise: Promise<IDBPDatabase | null>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by_name', 'metadata.name', { unique: false });
          // Note: IndexedDB doesn't easily index arrays of objects (appearances.assetId)
          // We'll handle asset->entity mapping via a separate store or manual indexing
        }
        if (!db.objectStoreNames.contains('asset_to_entity')) {
          const assetStore = db.createObjectStore('asset_to_entity', { keyPath: 'id' });
          assetStore.createIndex('by_asset', 'assetId', { unique: false });
          assetStore.createIndex('by_entity', 'entityId', { unique: false });
        }
      },
    }).catch(err => {
      console.warn('[EntityCache] Failed to open IndexedDB:', err);
      return null;
    });
  }

  async get(id: string): Promise<Entity | undefined> {
    // Check L1
    if (this.l1Cache.has(id)) {
      this.updateLru(id);
      return this.l1Cache.get(id);
    }

    // Check L2
    try {
      const db = await this.dbPromise;
      if (db) {
        const entity = await db.get(STORE_NAME, id);
        if (entity) {
          this.setL1(id, entity);
          return entity;
        }
      }
    } catch (err) {
      console.warn(`[EntityCache] Failed to get entity ${id} from L2:`, err);
    }

    return undefined;
  }

  async set(entity: Entity): Promise<void> {
    this.setL1(entity.id, entity);

    // Write to L2
    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction([STORE_NAME, 'asset_to_entity'], 'readwrite');
        await tx.objectStore(STORE_NAME).put(entity);
        
        // Update asset mappings
        const assetStore = tx.objectStore('asset_to_entity');
        // First, delete old mappings for this entity
        const oldMappings = await assetStore.index('by_entity').getAllKeys(entity.id);
        for (const key of oldMappings) {
          await assetStore.delete(key);
        }
        
        // Add new mappings from assetIds
        for (const assetId of entity.assetIds) {
          await assetStore.put({
            id: `${assetId}_${entity.id}`,
            assetId: assetId,
            entityId: entity.id
          });
        }
        
        await tx.done;
      }
    } catch (err) {
      console.warn(`[EntityCache] Failed to set entity ${entity.id} to L2:`, err);
    }
  }

  async delete(id: string): Promise<void> {
    this.l1Cache.delete(id);
    this.l1Order = this.l1Order.filter(k => k !== id);

    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction([STORE_NAME, 'asset_to_entity'], 'readwrite');
        await tx.objectStore(STORE_NAME).delete(id);
        
        const assetStore = tx.objectStore('asset_to_entity');
        const oldMappings = await assetStore.index('by_entity').getAllKeys(id);
        for (const key of oldMappings) {
          await assetStore.delete(key);
        }
        
        await tx.done;
      }
    } catch (err) {
      console.warn(`[EntityCache] Failed to delete entity ${id} from L2:`, err);
    }
  }

  async getByName(name: string): Promise<Entity | undefined> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const entity = await db.getFromIndex(STORE_NAME, 'by_name', name);
        if (entity) {
          this.setL1(entity.id, entity);
          return entity;
        }
      }
    } catch (err) {
      console.warn(`[EntityCache] Failed to get entity by name ${name}:`, err);
    }
    return undefined;
  }

  async getEntitiesForAsset(assetId: string): Promise<string[]> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const mappings = await db.getAllFromIndex('asset_to_entity', 'by_asset', assetId);
        return mappings.map(m => m.entityId);
      }
    } catch (err) {
      console.warn(`[EntityCache] Failed to get entities for asset ${assetId}:`, err);
    }
    return [];
  }

  async getAssetsForEntity(entityId: string): Promise<string[]> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const mappings = await db.getAllFromIndex('asset_to_entity', 'by_entity', entityId);
        return mappings.map(m => m.assetId);
      }
    } catch (err) {
      console.warn(`[EntityCache] Failed to get assets for entity ${entityId}:`, err);
    }
    return [];
  }

  async getAll(): Promise<Entity[]> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const entities = await db.getAll(STORE_NAME);
        for (const e of entities) {
          this.setL1(e.id, e);
        }
        return entities;
      }
    } catch (err) {
      console.warn(`[EntityCache] Failed to get all entities from L2:`, err);
    }
    return Array.from(this.l1Cache.values());
  }

  private setL1(id: string, entity: Entity) {
    if (this.l1Cache.has(id)) {
      this.updateLru(id);
    } else {
      if (this.l1Cache.size >= this.MAX_L1_SIZE) {
        const oldest = this.l1Order.shift();
        if (oldest) this.l1Cache.delete(oldest);
      }
      this.l1Order.push(id);
    }
    this.l1Cache.set(id, entity);
  }

  private updateLru(id: string) {
    this.l1Order = this.l1Order.filter(k => k !== id);
    this.l1Order.push(id);
  }
}

export const entityCache = new EntityCache();
