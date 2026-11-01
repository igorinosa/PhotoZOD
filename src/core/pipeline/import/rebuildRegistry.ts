import { assetStore, AssetStore } from '../../dam/assetStore';
import { processFile } from './importManager';
import { fsManager } from '../../fs/fileSystem';
import { indexer } from '../../dam/indexer';
import { Asset } from '../../dam/types';
import { transactionManager } from '../../storage/transaction';

export interface RebuildProgress {
  total: number;
  processed: number;
  currentFile: string;
  status: string;
}

/**
 * STAGE 0F — ASSET REGISTRY REBUILD
 * 
 * Rebuilds the entire asset registry from source files.
 * Ensures consistency, determinism, and fixes legacy data issues.
 */
export async function rebuildRegistry(onProgress?: (progress: RebuildProgress) => void) {
  console.log('[Rebuild] Starting Asset Registry Rebuild...');

  if (!fsManager.hasAccess()) {
    console.log('[Rebuild] No directory access, requesting...');
    const granted = await fsManager.requestAccess();
    if (!granted) {
      throw new Error('No directory access');
    }
  }

  // 1. Backup User Data (PART 0F.10)
  const userDataBackup = new Map<string, Partial<Asset>>();
  const currentAssets = assetStore.getAll();
  for (const asset of currentAssets) {
    userDataBackup.set(asset.assetId, {
      culling: asset.culling,
      pickStatus: asset.pickStatus,
      isTrashed: asset.isTrashed,
      trashedAt: asset.trashedAt,
      entityIds: asset.entityIds,
      // Add other user-modifiable fields here
    });
  }

  // 2. Instantiate New Store (PART 0F.4)
  const newStore = new AssetStore();

  // 3. Get All Source Files
  const files = await fsManager.getAllFiles();
  const total = files.length;
  let processed = 0;

  console.log(`[Rebuild] Found ${total} source files.`);

  // 4. Process Each File (PART 0F.6)
  for (const file of files) {
    processed++;
    onProgress?.({
      total,
      processed,
      currentFile: file.name,
      status: 'Processing'
    });

    try {
      // Run full pipeline into the NEW store
      const imported = await processFile(file, (p) => {
        onProgress?.({
          total,
          processed,
          currentFile: file.name,
          status: p.status
        });
      }, {
        store: newStore,
        skipAI: true, // Re-running AI is expensive, maybe skip for now or batch later
        skipPersistence: true // Don't save individual assets during rebuild
      });

      // 5. Re-apply User Data (PART 0F.10)
      const backup = userDataBackup.get(imported.assetId);
      if (backup) {
        const asset = newStore.get(imported.assetId);
        if (asset) {
          Object.assign(asset, backup);
        }
      }
    } catch (error) {
      console.error(`[Rebuild] Failed to process ${file.name}:`, error);
      // PART 0F.12: Robust Failure Handling - continue with next file
    }
  }

  // 6. Atomic Swap (PART 0F.13)
  console.log('[Rebuild] Rebuild complete. Performing atomic swap...');
  const finalAssets = newStore.getAll();
  
  // Replace the live store's content
  assetStore.replaceAll(finalAssets);

  // 7. Re-index Everything
  indexer.clear();
  for (const asset of finalAssets) {
    indexer.index(asset);
  }

  // 8. Persist New Registry
  await transactionManager.runTransaction({ assets: finalAssets });

  console.log('[Rebuild] Registry rebuild successful.');
  return finalAssets.length;
}
