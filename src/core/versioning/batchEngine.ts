import { EditOperation, BatchEdit } from '../../shared/types';
import { batchStore } from './batchStore';
import { assetStore } from '../dam/assetStore';

export const batchEngine = {
  applyBatch: (assetIds: string[], operations: EditOperation[], name?: string) => {
    if (assetIds.length === 0 || operations.length === 0) return null;

    // Soft limit: 5000 assets
    const targetIds = assetIds.slice(0, 5000);
    if (assetIds.length > 5000) {
      console.warn(`Batch size soft limit reached (5000). Only first 5000 assets will be processed.`);
    }

    // 1. Create BatchEdit via store
    const batchId = batchStore.createBatch(operations, targetIds, name);

    // 2. Link all assets to batchId
    for (const assetId of targetIds) {
      const asset = assetStore.get(assetId);
      if (asset) {
        const currentBatchIds = asset.batchIds || [];
        if (!currentBatchIds.includes(batchId)) {
          assetStore.update(assetId, {
            batchIds: [...currentBatchIds, batchId]
          });
        }
      }
    }

    return batchId;
  },

  unlinkAssets: (batchId: string, assetIds: string[]) => {
    // 1. Update batch store for each asset
    for (const assetId of assetIds) {
      batchStore.unlinkAsset(batchId, assetId);
    }

    // 2. Update asset models
    for (const assetId of assetIds) {
      const asset = assetStore.get(assetId);
      if (asset && asset.batchIds) {
        assetStore.update(assetId, {
          batchIds: asset.batchIds.filter(id => id !== batchId)
        });
      }
    }
  },

  deleteBatch: (batchId: string) => {
    const batch = batchStore.getBatch(batchId);
    if (!batch) return;

    // 1. Unlink from all assets
    for (const assetId of batch.assetIds) {
      const asset = assetStore.get(assetId);
      if (asset && asset.batchIds) {
        assetStore.update(assetId, {
          batchIds: asset.batchIds.filter(id => id !== batchId)
        });
      }
    }

    // 2. Delete from store
    batchStore.deleteBatch(batchId);
  }
};
