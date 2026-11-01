import { Asset } from '../dam/types';

export type AssetEventType = 
  | 'ASSET_IMPORTED' 
  | 'ASSET_UPDATED' 
  | 'BATCH_UPDATED'
  | 'ASSET_DELETED' 
  | 'ASSET_METADATA_CHANGED' 
  | 'REPROCESS_PROGRESS'
  | 'PIPELINE_COMPLETE'
  | 'PIPELINE_FAILED'
  | 'DUPLICATE_DETECTED';

export type AssetEventListener = (event: AssetEventType, payload: any) => void;

class AssetEventBus {
  private listeners: Map<AssetEventType, Set<AssetEventListener>> = new Map();

  subscribe(event: AssetEventType, listener: AssetEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: AssetEventType, payload: any): void {
    if (this.listeners.has(event)) {
      for (const listener of this.listeners.get(event)!) {
        try {
          listener(event, payload);
        } catch (e) {
          console.error(`[AssetEventBus] Error in listener for ${event}:`, e);
        }
      }
    }
  }
}

export const assetEventBus = new AssetEventBus();
