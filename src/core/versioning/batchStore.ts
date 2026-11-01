import { BatchEdit, EditOperation } from '../../shared/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BatchStoreState {
  batches: Record<string, BatchEdit>;
  createBatch: (operations: EditOperation[], assetIds: string[], name?: string) => string;
  updateBatch: (batchId: string, operations: EditOperation[]) => void;
  deleteBatch: (batchId: string) => void;
  getBatch: (batchId: string) => BatchEdit | undefined;
  getAllBatches: () => BatchEdit[];
  linkAssets: (batchId: string, assetIds: string[]) => void;
  unlinkAsset: (batchId: string, assetId: string) => void;
}

export const useBatchStore = create<BatchStoreState>()(
  persist(
    (set, get) => ({
      batches: {},
      
      createBatch: (operations, assetIds, name) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const batch: BatchEdit = {
          id,
          name: name || `Batch ${new Date().toLocaleTimeString()}`,
          operations,
          assetIds,
          createdAt: now,
          updatedAt: now
        };
        set((state) => ({
          batches: { ...state.batches, [id]: batch }
        }));
        return id;
      },

      updateBatch: (batchId, operations) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;
          return {
            batches: {
              ...state.batches,
              [batchId]: { 
                ...batch, 
                operations, 
                updatedAt: Date.now() 
              }
            }
          };
        });
      },

      deleteBatch: (id) => {
        set((state) => {
          const newBatches = { ...state.batches };
          delete newBatches[id];
          return { batches: newBatches };
        });
      },

      getBatch: (id) => {
        return get().batches[id];
      },

      getAllBatches: () => {
        return Object.values(get().batches);
      },

      linkAssets: (batchId, assetIds) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;
          const newAssetIds = Array.from(new Set([...batch.assetIds, ...assetIds]));
          return {
            batches: {
              ...state.batches,
              [batchId]: { 
                ...batch, 
                assetIds: newAssetIds,
                updatedAt: Date.now()
              }
            }
          };
        });
      },

      unlinkAsset: (batchId, assetId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;
          const newAssetIds = batch.assetIds.filter(id => id !== assetId);
          return {
            batches: {
              ...state.batches,
              [batchId]: { 
                ...batch, 
                assetIds: newAssetIds,
                updatedAt: Date.now()
              }
            }
          };
        });
      }
    }),
    {
      name: 'dam-batch-store',
      version: 1,
    }
  )
);

export const batchStore = {
  createBatch: (operations: EditOperation[], assetIds: string[], name?: string) => useBatchStore.getState().createBatch(operations, assetIds, name),
  updateBatch: (id: string, operations: EditOperation[]) => useBatchStore.getState().updateBatch(id, operations),
  deleteBatch: (id: string) => useBatchStore.getState().deleteBatch(id),
  getBatch: (id: string) => useBatchStore.getState().getBatch(id),
  getAllBatches: () => useBatchStore.getState().getAllBatches(),
  linkAssets: (batchId: string, assetIds: string[]) => useBatchStore.getState().linkAssets(batchId, assetIds),
  unlinkAsset: (batchId: string, assetId: string) => useBatchStore.getState().unlinkAsset(batchId, assetId),
};
