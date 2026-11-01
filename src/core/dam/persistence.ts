import { Asset } from './types';
import { openDB } from 'idb';
import { assetStore } from './assetStore';
import { indexer } from './indexer';

const DB_NAME = 'photozod_dam';
const STORE_NAME = 'assets';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveAssets(assets: Asset[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  for (const asset of assets) {
    await store.put(asset);
  }
  
  await tx.done;
}

export async function deleteAsset(id: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function loadAssets(): Promise<Asset[]> {
  const db = await getDB();
  return await db.getAll(STORE_NAME);
}

export async function initDam() {
  const assets = await loadAssets();
  assetStore.clear();
  indexer.clear();
  for (const asset of assets) {
    assetStore.add(asset);
    indexer.index(asset);
  }
  console.log(`[DAM] Loaded ${assets.length} assets from IndexedDB`);
}
