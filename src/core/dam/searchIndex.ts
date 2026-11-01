import { SemanticData } from '../ai/vision/semanticBuilder';
import { openDB, IDBPDatabase } from 'idb';
import { entityStore } from '../entities/entityStore';

const DB_NAME = 'PhotoZOD_SearchIndex';
const DB_VERSION = 1;
const STORE_NAME = 'search';

export interface SearchDocument {
  id: string;
  text: string;
}

class SearchIndex {
  private dbPromise: Promise<IDBPDatabase | null>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    }).catch(err => {
      console.warn('[SearchIndex] Failed to open IndexedDB:', err);
      return null;
    });
  }

  async index(doc: SearchDocument): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (db) {
        await db.put(STORE_NAME, doc);
      }
    } catch (err) {
      console.warn(`[SearchIndex] Failed to index ${doc.id}:`, err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (db) {
        await db.delete(STORE_NAME, id);
      }
    } catch (err) {
      console.warn(`[SearchIndex] Failed to delete ${id}:`, err);
    }
  }

  async search(query: string): Promise<string[]> {
    try {
      const db = await this.dbPromise;
      if (!db) return [];
      
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const allDocs = await store.getAll();
      
      const queryTerms = query.toLowerCase().split(' ').filter(t => t.length > 0);
      
      return allDocs
        .filter(doc => {
          const docText = doc.text.toLowerCase();
          return queryTerms.every(term => docText.includes(term));
        })
        .map(doc => doc.id);
    } catch (err) {
      console.warn(`[SearchIndex] Search failed for "${query}":`, err);
      return [];
    }
  }
}

const searchIndex = new SearchIndex();

export async function indexAsset(semantic: SemanticData): Promise<void> {
  const personNames: string[] = [];
  if (semantic.entityIds && semantic.entityIds.length > 0) {
    for (const entityId of semantic.entityIds) {
      const entity = await entityStore.get(entityId);
      if (entity && entity.name) {
        personNames.push(entity.name);
      }
    }
  }

  const doc: SearchDocument = {
    id: semantic.id,
    text: [
      semantic.caption,
      ...semantic.tags,
      semantic.scene,
      semantic.attributes.lighting,
      semantic.attributes.mood,
      ...personNames
    ].join(' ')
  };
  await searchIndex.index(doc);
}

export async function searchAssets(query: string): Promise<string[]> {
  return await searchIndex.search(query);
}

export async function removeAssetFromIndex(id: string): Promise<void> {
  await searchIndex.delete(id);
}
