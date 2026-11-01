import { systemDB } from './db';
import { assetStore } from '../dam/assetStore';
import { indexer } from '../dam/indexer';
import { faceIndex } from '../face/faceIndex';
import { entityCache } from '../cache/entityCache';
import { dedupEngine } from '../dedup/dedupEngine';
import { importState } from '../pipeline/import/importState';
import { loadAssets as loadOldAssets } from '../dam/persistence';
import { runAcceptanceTest } from '../collections/acceptanceTest';
import { initIndexManager } from '../collections/indexManager';
import { reprocessEngine } from '../reprocess/reprocessEngine';

export class Bootloader {
  async boot() {
    console.log('[Bootloader] Starting system boot sequence...');
    
    // 1. Load Registry
    const registry = await systemDB.getSystemData('registry');
    if (registry) {
      console.log(`[Bootloader] Loaded registry version: ${registry.version}`);
      // Handle version migrations here if needed
    } else {
      console.log('[Bootloader] No registry found, initializing new system');
      await systemDB.saveSystemData('registry', {
        version: '1.0.0',
        lastOpened: Date.now()
      });

      // MIGRATION: Load from old DB if it exists
      try {
        const oldAssets = await loadOldAssets();
        if (oldAssets && oldAssets.length > 0) {
          console.log(`[Bootloader] Migrating ${oldAssets.length} assets from old DB...`);
          for (const asset of oldAssets) {
            await systemDB.saveAsset(asset);
          }
        }
      } catch (err) {
        console.warn('[Bootloader] Failed to migrate old assets:', err);
      }
    }

    // 2. Load Assets
    const assets = await systemDB.getAllAssets();
    console.log(`[Bootloader] Loaded ${assets.length} assets`);
    
    assetStore.clear();
    indexer.clear();
    faceIndex.clear();
    for (const asset of assets) {
      if (!asset) continue;
      
      // MIGRATION: Ensure strict data shape
      let needsSave = false;
      if (!asset.ai) {
        asset.ai = {
          faces: [],
          sceneType: 'unknown',
          tags: []
        };
        needsSave = true;
      }

      // TAG NORMALIZATION (UNTAGGED FIX)
      if (!Array.isArray(asset.ai.tags)) {
        asset.ai.tags = [];
        needsSave = true;
      } else {
        const originalLength = asset.ai.tags.length;
        asset.ai.tags = asset.ai.tags.filter(tag => !!tag && tag.trim() !== "");
        if (asset.ai.tags.length !== originalLength) {
          needsSave = true;
        }
      }

      if (asset.duplicateGroupId === undefined) {
        asset.duplicateGroupId = null;
        needsSave = true;
      }
      if (asset.rating === undefined) {
        asset.rating = null;
        needsSave = true;
      }
      if (asset.colorTag === undefined) {
        asset.colorTag = null;
        needsSave = true;
      }
      
      if (needsSave) {
        await systemDB.saveAsset(asset);
      }
      
      assetStore.add(asset);
      indexer.index(asset);
    }
    
    // Initialize IndexManager
    initIndexManager(assetStore.getAll());

    // 3. Load Entities
    const entities = await systemDB.getAllEntities();
    console.log(`[Bootloader] Loaded ${entities.length} entities`);
    
    for (const entity of entities) {
      await entityCache.set(entity);
    }

    // 4. Rebuild Relationships (Duplicate Groups)
    const duplicateGroups = await systemDB.getSystemData('duplicateGroups');
    if (duplicateGroups) {
      console.log(`[Bootloader] Loaded ${duplicateGroups.length} duplicate groups`);
      // Initialize dedup engine state if needed
      // Currently dedup engine derives groups from asset.groupId, but we can store explicit groups here
    }

    // 5. Restore UI State
    const uiState = await systemDB.getSystemData('uiState');
    if (uiState) {
      console.log('[Bootloader] Loaded UI state');
      // Apply UI state (e.g., last viewed image, zoom level)
    }

    // 6. Validate Reference Integrity (PART 0J.10)
    await this.validateIntegrity(assets, entities);

    // 7. Notify UI
    await importState.loadAssetsFromStore();
    
    // 8. Enforce Schema Integrity before tests
    console.log('[Bootloader] Enforcing schema integrity...');
    const allAssets = assetStore.getAll();
    for (const asset of allAssets) {
      const safeAsset = assetStore.get(asset.assetId); // Get fresh from store
      if (safeAsset) {
        // ensureAssetShape is already called in assetStore.update/add, 
        // but we want to make sure it's persisted.
        await systemDB.saveAsset(safeAsset);
      }
    }

    // 9. Run Smart Collection Acceptance Tests
    console.log('[Bootloader] Running Smart Collection Acceptance Tests...');
    const testResult = await runAcceptanceTest();
    if (testResult) {
      console.log('[Bootloader] Acceptance Tests PASSED.');
    } else {
      console.error('[Bootloader] Acceptance Tests FAILED. Check console for details.');
    }

    // Run Batch Validation Tests
    const { runBatchValidationTests } = await import('../versioning/batchValidationTest');
    await runBatchValidationTests();

    console.log('[Bootloader] Triggering background reprocess...');
    reprocessEngine.reprocessAll({ priority: 'low', force: false }).catch(console.error);

    console.log('[Bootloader] System boot complete.');
  }

  private async validateIntegrity(assets: any[], entities: any[]) {
    console.log('[Bootloader] Validating reference integrity...');
    
    const assetIds = new Set(assets.map(a => a.assetId));
    const entityIds = new Set(entities.map(e => e.id));

    let repairedAssets = 0;
    let repairedEntities = 0;

    // Check Assets -> Entities
    for (const asset of assets) {
      if (asset.entityIds) {
        const validEntityIds = asset.entityIds.filter(id => entityIds.has(id));
        if (validEntityIds.length !== asset.entityIds.length) {
          asset.entityIds = validEntityIds;
          await systemDB.saveAsset(asset);
          assetStore.update(asset.assetId, { entityIds: validEntityIds });
          repairedAssets++;
        }
      }
    }

    // Check Entities -> Assets
    for (const entity of entities) {
      if (entity.assetIds) {
        const validAssetIds = entity.assetIds.filter(id => assetIds.has(id));
        if (validAssetIds.length !== entity.assetIds.length) {
          entity.assetIds = validAssetIds;
          await systemDB.saveEntity(entity);
          await entityCache.set(entity);
          repairedEntities++;
        }
      }
    }

    if (repairedAssets > 0 || repairedEntities > 0) {
      console.warn(`[Bootloader] Integrity check repaired ${repairedAssets} assets and ${repairedEntities} entities.`);
    } else {
      console.log('[Bootloader] Integrity check passed. No broken references.');
    }
  }
}

export const bootloader = new Bootloader();
