import { openDB, IDBPDatabase } from 'idb';
import { EntityPreset } from '../entities/presets/entityPresetManager';

const DB_NAME = 'PhotoZOD_PresetCache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'presets';

class PresetCache {
  private l1Cache: Map<string, EntityPreset> = new Map();
  private entityIndex: Map<string, Set<string>> = new Map();
  private dbPromise: Promise<IDBPDatabase | null>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by_entity', 'entityId', { unique: false });
        }
      },
    }).catch(err => {
      console.warn('[PresetCache] Failed to open IndexedDB:', err);
      return null;
    });
  }

  async get(id: string): Promise<EntityPreset | undefined> {
    if (this.l1Cache.has(id)) {
      return this.l1Cache.get(id);
    }

    try {
      const db = await this.dbPromise;
      if (db) {
        const preset = await db.get(STORE_NAME, id);
        if (preset) {
          this.setL1(preset);
          return preset;
        }
      }
    } catch (err) {
      console.warn(`[PresetCache] Failed to get preset ${id}:`, err);
    }
    return undefined;
  }

  async getByEntity(entityId: string): Promise<EntityPreset[]> {
    // Check if we have it fully loaded in L1
    // For simplicity, we'll try to fetch from L2 and merge
    try {
      const db = await this.dbPromise;
      if (db) {
        const presets = await db.getAllFromIndex(STORE_NAME, 'by_entity', entityId);
        for (const p of presets) {
          this.setL1(p);
        }
        return presets;
      }
    } catch (err) {
      console.warn(`[PresetCache] Failed to get presets for entity ${entityId}:`, err);
    }
    
    // Fallback to L1
    const presetIds = this.entityIndex.get(entityId) || new Set();
    return Array.from(presetIds).map(id => this.l1Cache.get(id)!).filter(Boolean);
  }

  async getAll(): Promise<EntityPreset[]> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const presets = await db.getAll(STORE_NAME);
        for (const p of presets) {
          this.setL1(p);
        }
        return presets;
      }
    } catch (err) {
      console.warn(`[PresetCache] Failed to get all presets:`, err);
    }
    return Array.from(this.l1Cache.values());
  }

  async set(preset: EntityPreset): Promise<void> {
    this.setL1(preset);

    try {
      const db = await this.dbPromise;
      if (db) {
        await db.put(STORE_NAME, preset);
      }
    } catch (err) {
      console.warn(`[PresetCache] Failed to set preset ${preset.id}:`, err);
    }
  }

  async delete(id: string): Promise<void> {
    const preset = this.l1Cache.get(id);
    if (preset && preset.entityId) {
      const entitySet = this.entityIndex.get(preset.entityId);
      if (entitySet) entitySet.delete(id);
    }
    this.l1Cache.delete(id);

    try {
      const db = await this.dbPromise;
      if (db) {
        await db.delete(STORE_NAME, id);
      }
    } catch (err) {
      console.warn(`[PresetCache] Failed to delete preset ${id}:`, err);
    }
  }

  private setL1(preset: EntityPreset) {
    this.l1Cache.set(preset.id, preset);
    if (preset.entityId) {
      if (!this.entityIndex.has(preset.entityId)) {
        this.entityIndex.set(preset.entityId, new Set());
      }
      this.entityIndex.get(preset.entityId)!.add(preset.id);
    }
  }
}

export const presetCache = new PresetCache();
