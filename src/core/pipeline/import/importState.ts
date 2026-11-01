import { ImportedAsset, ImportProgress } from './importManagerTypes';
import { assetStore } from '../../dam/assetStore';
import { previewCache } from '../../cache/previewCache';
import { assetEventBus } from '../../events/assetEvents';

export const importState = {
  total: 0,
  processed: 0,
  failed: 0,
  currentProgress: null as ImportProgress | null,
  assets: [] as ImportedAsset[],
  listeners: new Set<() => void>(),
  assetListeners: new Set<(asset: ImportedAsset) => void>(),
  assetUpdateListeners: new Set<(asset: ImportedAsset) => void>(),
  batchUpdateListeners: new Set<(assets: ImportedAsset[]) => void>(),
  assetDeleteListeners: new Set<(assetId: string) => void>(),
  assetsReloadedListeners: new Set<() => void>(),
  urlMap: new Map<string, string>(), // assetId -> objectUrl

  async loadAssetsFromStore() {
    console.log('[ImportState] Loading assets from store into UI state...');
    const damAssets = assetStore.getAll();
    const importedAssets: ImportedAsset[] = [];

    // Revoke all existing URLs before reloading
    this.urlMap.forEach(url => URL.revokeObjectURL(url));
    this.urlMap.clear();

    for (const asset of damAssets) {
      const cached = await previewCache.get(asset.assetId);
      if (cached && cached.mediumPreview) {
        const url = URL.createObjectURL(cached.mediumPreview);
        this.urlMap.set(asset.assetId, url);
        importedAssets.push({
          ...asset,
          file: new File([cached.mediumPreview], asset.fileName, { type: cached.mediumPreview.type || 'image/jpeg' }),
          metadata: cached.metadata,
          thumbnailUrl: url,
          previewUrl: url,
          previewBlob: cached.mediumPreview
        });
      } else {
        // Fallback for missing previews (should not happen if OPFS is intact)
        console.warn(`[ImportState] Missing preview for asset ${asset.assetId}`);
      }
    }

    this.assets = importedAssets;
    this.assetsReloadedListeners.forEach(l => l());
    this.notify();
  },

  async refreshAsset(assetId: string) {
    console.log(`[ImportState] Refreshing asset URLs for ${assetId}...`);
    const asset = assetStore.get(assetId);
    if (!asset) return;

    const cached = await previewCache.get(assetId);
    if (cached && cached.mediumPreview) {
      // Revoke old URL
      const oldUrl = this.urlMap.get(assetId);
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      const url = URL.createObjectURL(cached.mediumPreview);
      this.urlMap.set(assetId, url);

      const importedAsset: ImportedAsset = {
        ...asset,
        file: new File([cached.mediumPreview], asset.fileName, { type: cached.mediumPreview.type || 'image/jpeg' }),
        metadata: cached.metadata,
        thumbnailUrl: url,
        previewUrl: url,
        previewBlob: cached.mediumPreview
      };

      this.notifyAssetUpdate(importedAsset);
      return url;
    } else {
      console.warn(`[ImportState] Failed to refresh asset ${assetId}: preview not found in cache`);
      // If preview is missing, we might need to re-process it
      return null;
    }
  },

  notify() {
    this.listeners.forEach(l => l());
  },

  updateProgress(progress: ImportProgress | null) {
    this.currentProgress = progress;
    this.notify();
  },

  notifyAsset(asset: ImportedAsset) {
    if (!this.assets.some(a => a.assetId === asset.assetId)) {
      this.assets.push(asset);
    }
    this.assetListeners.forEach(l => l(asset));
    this.notify();
  },

  notifyAssetUpdate(asset: ImportedAsset) {
    const index = this.assets.findIndex(a => a.assetId === asset.assetId);
    if (index !== -1) {
      this.assets[index] = { ...this.assets[index], ...asset };
    }
    this.assetUpdateListeners.forEach(l => l(asset));
    this.notify();
  },

  notifyAssetDelete(assetId: string) {
    this.assets = this.assets.filter(a => a.assetId !== assetId);
    this.assetDeleteListeners.forEach(l => l(assetId));
    this.notify();
  },

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  subscribeToAssets(listener: (asset: ImportedAsset) => void) {
    this.assetListeners.add(listener);
    return () => this.assetListeners.delete(listener);
  },

  subscribeToAssetUpdates(listener: (asset: ImportedAsset) => void) {
    this.assetUpdateListeners.add(listener);
    return () => this.assetUpdateListeners.delete(listener);
  },
  
  subscribeToBatchUpdates(listener: (assets: ImportedAsset[]) => void) {
    this.batchUpdateListeners.add(listener);
    return () => this.batchUpdateListeners.delete(listener);
  },

  subscribeToAssetDeletes(listener: (assetId: string) => void) {
    this.assetDeleteListeners.add(listener);
    return () => this.assetDeleteListeners.delete(listener);
  },

  subscribeToAssetsReloaded(listener: () => void) {
    this.assetsReloadedListeners.add(listener);
    return () => this.assetsReloadedListeners.delete(listener);
  },

  reset() {
    this.total = 0;
    this.processed = 0;
    this.failed = 0;
    // Do not reset assets here, as they should persist across imports
    this.notify();
  }
};

// Keep importState in sync with assetStore
assetEventBus.subscribe('ASSET_UPDATED', (event, asset) => {
  const index = importState.assets.findIndex(a => a.assetId === asset.assetId);
  if (index !== -1) {
    // Merge the updated dam asset into the imported asset
    const updatedImportedAsset = { ...importState.assets[index], ...asset };
    importState.assets[index] = updatedImportedAsset;
    importState.assetUpdateListeners.forEach(l => l(updatedImportedAsset));
    importState.notify();
  }
});

assetEventBus.subscribe('BATCH_UPDATED', (event, assets: any[]) => {
  const updatedAssets: ImportedAsset[] = [];
  assets.forEach(asset => {
    const index = importState.assets.findIndex(a => a.assetId === asset.assetId);
    if (index !== -1) {
      const updatedImportedAsset = { ...importState.assets[index], ...asset };
      importState.assets[index] = updatedImportedAsset;
      updatedAssets.push(updatedImportedAsset);
    }
  });
  
  if (updatedAssets.length > 0) {
    importState.batchUpdateListeners.forEach(l => l(updatedAssets));
  }
  importState.notify();
});

assetEventBus.subscribe('ASSET_DELETED', (event, assetId) => {
  importState.notifyAssetDelete(assetId);
});
