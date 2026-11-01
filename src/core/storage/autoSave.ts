import { Asset } from '../dam/types';
import { Entity } from '../entities/schema';
import { transactionManager } from './transaction';

class AutoSaveManager {
  private pendingAssets = new Map<string, Asset>();
  private pendingEntities = new Map<string, Entity>();
  private pendingSystemData = new Map<string, any>();
  private saveTimeout: number | null = null;
  private readonly DEBOUNCE_MS = 300;

  /**
   * PART 0J.8 - AUTO-SAVE SYSTEM
   * Queues an asset for saving and debounces the actual write.
   */
  queueAssetUpdate(asset: Asset) {
    this.pendingAssets.set(asset.assetId, asset);
    this.scheduleSave();
  }

  queueEntityUpdate(entity: Entity) {
    this.pendingEntities.set(entity.id, entity);
    this.scheduleSave();
  }

  queueSystemDataUpdate(key: string, data: any) {
    this.pendingSystemData.set(key, data);
    this.scheduleSave();
  }

  removePendingAsset(assetId: string) {
    this.pendingAssets.delete(assetId);
  }

  removePendingEntity(entityId: string) {
    this.pendingEntities.delete(entityId);
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = window.setTimeout(() => {
      this.commit();
    }, this.DEBOUNCE_MS);
  }

  async commit() {
    if (this.pendingAssets.size === 0 && this.pendingEntities.size === 0 && this.pendingSystemData.size === 0) {
      return;
    }

    const assetsToSave = Array.from(this.pendingAssets.values());
    const entitiesToSave = Array.from(this.pendingEntities.values());
    const systemDataToSave = Array.from(this.pendingSystemData.entries()).map(([key, data]) => ({ key, data }));

    this.pendingAssets.clear();
    this.pendingEntities.clear();
    this.pendingSystemData.clear();
    this.saveTimeout = null;

    try {
      await transactionManager.runTransaction({
        assets: assetsToSave,
        entities: entitiesToSave,
        systemData: systemDataToSave
      });
      console.log(`[AutoSave] Committed ${assetsToSave.length} assets, ${entitiesToSave.length} entities, ${systemDataToSave.length} system data`);
    } catch (error) {
      console.error('[AutoSave] Failed to commit transaction:', error);
      // Re-queue failed items
      assetsToSave.forEach(a => this.pendingAssets.set(a.assetId, a));
      entitiesToSave.forEach(e => this.pendingEntities.set(e.id, e));
      systemDataToSave.forEach(s => this.pendingSystemData.set(s.key, s.data));
      this.scheduleSave();
    }
  }
}

export const autoSaveManager = new AutoSaveManager();
