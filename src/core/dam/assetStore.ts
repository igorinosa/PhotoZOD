import { Asset } from './types';
import { indexer } from './indexer';
import { importState } from '../pipeline/import/importState';
import { assetEventBus } from '../events/assetEvents';
import { autoSaveManager } from '../storage/autoSave';
import { systemDB } from '../storage/db';
import { opfsManager } from '../storage/opfs';
import { previewCache } from '../cache/previewCache';
import { removeAssetFromIndex } from './searchIndex';
import { deleteSemantic } from '../pipeline/cache/semanticStore';
import { getIndexManager } from '../collections/indexManager';
import { FormatResolver } from '../formats/formatResolver';
import { faceIndex } from '../face/faceIndex';
import { ImportedAsset } from '../../shared/types';

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function ensureAssetShape(asset: Asset): Asset {
  const format = asset.format || (asset.fileName?.includes('.') ? asset.fileName.split('.').pop() || 'unknown' : 'unknown');
  const formatGroup = FormatResolver.resolve(format);

  const safeAsset: any = {
    ...asset,
    format,
    formatGroup,
    duplicateGroupId: asset.duplicateGroupId ?? null,
    rating: asset.rating ?? null,
    colorTag: asset.colorTag || 'none',
    isTrashed: asset.isTrashed ?? false,
    trashedAt: asset.trashedAt ?? null,
    fileSize: asset.fileSize ?? asset.size ?? 0,
    entityIds: asset.entityIds ?? [],
    backupStatus: asset.backupStatus ?? {
      local: true,
      external: false,
      cloud: false
    },
    ai: {
      faces: asset.ai?.faces ?? [],
      sceneType: asset.ai?.sceneType ?? "unknown",
      tags: (Array.isArray(asset.ai?.tags) ? asset.ai.tags : [])
        .map(normalizeTag)
        .filter(tag => !!tag && tag !== "")
        .filter((v, i, a) => a.indexOf(v) === i)
    }
  };

  if (!safeAsset.color) {
    safeAsset.color = safeAsset.colorTag && safeAsset.colorTag !== 'none' ? [safeAsset.colorTag] : [];
  }

  return safeAsset as Asset;
}

export class AssetStore {
  private assets = new Map<string, Asset>();

  add(asset: Asset) {
    const safeAsset = ensureAssetShape(asset);
    this.assets.set(safeAsset.assetId, safeAsset);
    autoSaveManager.queueAssetUpdate(safeAsset);
    assetEventBus.emit('ASSET_IMPORTED', safeAsset);
    getIndexManager()?.indexAsset(safeAsset);
    faceIndex.indexAsset(safeAsset as ImportedAsset);
  }

  get(assetId: string): Asset | undefined {
    return this.assets.get(assetId);
  }

  getAssetsByIds(assetIds: string[]): ImportedAsset[] {
    return assetIds.map(id => this.assets.get(id)).filter((a): a is ImportedAsset => !!a);
  }

  getAssetsByBatch(batchId: string): Asset[] {
    return Array.from(this.assets.values()).filter(a => a.batchIds?.includes(batchId));
  }

  getAll(): Asset[] {
    return Array.from(this.assets.values());
  }

  update(assetId: string, updates: Partial<Asset>) {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    indexer.remove(asset);
    getIndexManager()?.removeAsset(asset);
    faceIndex.removeAsset(asset.assetId);
    const updatedAsset = ensureAssetShape({ ...asset, ...updates } as Asset);
    this.assets.set(assetId, updatedAsset);
    indexer.index(updatedAsset);
    getIndexManager()?.indexAsset(updatedAsset);
    faceIndex.indexAsset(updatedAsset as ImportedAsset);
    
    autoSaveManager.queueAssetUpdate(updatedAsset);
    assetEventBus.emit('ASSET_UPDATED', updatedAsset);
  }
  
  batchUpdate(updates: { assetId: string, updates: Partial<Asset> }[]) {
    const updatedAssets: Asset[] = [];
    
    for (const { assetId, updates: assetUpdates } of updates) {
      const asset = this.assets.get(assetId);
      if (!asset) continue;
      
      indexer.remove(asset);
      getIndexManager()?.removeAsset(asset);
      faceIndex.removeAsset(asset.assetId);
      const updatedAsset = ensureAssetShape({ ...asset, ...assetUpdates } as Asset);
      this.assets.set(assetId, updatedAsset);
      indexer.index(updatedAsset);
      getIndexManager()?.indexAsset(updatedAsset);
      faceIndex.indexAsset(updatedAsset as ImportedAsset);
      
      autoSaveManager.queueAssetUpdate(updatedAsset);
      updatedAssets.push(updatedAsset);
    }
    
    if (updatedAssets.length > 0) {
      assetEventBus.emit('BATCH_UPDATED', updatedAssets);
    }
  }

  remove(assetId: string) {
    const asset = this.assets.get(assetId);
    if (asset) {
      indexer.remove(asset);
      getIndexManager()?.removeAsset(asset);
      this.assets.delete(assetId);
      autoSaveManager.removePendingAsset(assetId);
      systemDB.deleteAsset(assetId).catch(console.error);
      previewCache.delete(assetId).catch(console.error);
      removeAssetFromIndex(assetId).catch(console.error);
      deleteSemantic(assetId).catch(console.error);
      faceIndex.removeAsset(assetId);
      importState.notifyAssetDelete(assetId);
      assetEventBus.emit('ASSET_DELETED', assetId);
    }
  }

  clear() {
    this.assets.clear();
  }

  replaceAll(newAssets: Asset[]) {
    this.assets.clear();
    indexer.clear();
    faceIndex.clear();
    for (const asset of newAssets) {
      const safeAsset = ensureAssetShape(asset);
      this.assets.set(safeAsset.assetId, safeAsset);
      indexer.index(safeAsset);
      getIndexManager()?.indexAsset(safeAsset);
      faceIndex.indexAsset(safeAsset as ImportedAsset);
    }
    importState.notify();
  }
}

export const assetStore = new AssetStore();
