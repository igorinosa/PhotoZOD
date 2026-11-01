import { Asset } from '../dam/types';
import { assetStore, AssetStore } from '../dam/assetStore';
import { assetEventBus } from '../events/assetEvents';
import { buildClusters, Cluster } from './cluster';
import { pickBestImage } from './scoring';
import { compareImages } from '../hash/comparison';
import { compareFaceSets } from '../face/faceMatcher';

export interface DuplicateMatch {
  primary: Asset;
  duplicate: Asset;
  confidence: 'high' | 'medium' | 'low';
  type: 'exact' | 'visual';
}

export interface DuplicateGroup {
  groupId: string;
  assetIds: string[];
  similarityScore: number; // Average similarity within group
  recommendedAssetId?: string;
}

/**
 * STAGE 0G — DEDUPLICATION ENGINE
 * 
 * Central authority for detecting and merging duplicate assets.
 */
export class DedupEngine {
  private detectedDuplicates: DuplicateMatch[] = [];
  private autoMerge = true;
  
  constructor() {
    // Listen for new assets to update buckets
    assetEventBus.subscribe('ASSET_IMPORTED', (event, asset) => {
      // Re-run clustering if needed
    });
  }

  setAutoMerge(enabled: boolean) {
    this.autoMerge = enabled;
  }

  /**
   * Forces a rebuild of duplicate groups.
   */
  rebuildGroups() {
    console.log('[DedupEngine] Rebuilding duplicate groups...');
    this.detectedDuplicates = [];
    
    // Clear existing group assignments to prevent stale/incorrect groups from persisting
    const assets = assetStore.getAll();
    for (const asset of assets) {
      assetStore.update(asset.assetId, { 
        groupId: undefined,
        pipelineState: {
          ...asset.pipelineState,
          grouped: 'pending',
          deduped: 'pending'
        }
      });
    }
  }

  /**
   * Runs deduplication for a single asset.
   * Can be triggered after import, update, or during a background scan.
   */
  getDetectedDuplicates() {
    return this.detectedDuplicates;
  }

  clearDetectedDuplicates() {
    this.detectedDuplicates = [];
  }
  /**
   * Runs deduplication for a single asset.
   * Can be triggered after import, update, or during a background scan.
   */
  async runDeduplication(asset: Asset, store: AssetStore = assetStore): Promise<Asset> {
    console.log(`[DedupEngine] Running dedup for ${asset.assetId} (${asset.fileName})`);
    
    // 1. Exact duplicate check (SHA-256)
    const exactDuplicate = store.getAll().find(a => a.assetId !== asset.assetId && a.hashes?.sha256 && a.hashes?.sha256 === asset.hashes?.sha256);
    if (exactDuplicate) {
      console.log(`[DedupEngine] Exact SHA-256 duplicate found: ${asset.assetId} -> ${exactDuplicate.assetId}`);
      return asset;
    }

    // 2. Visual duplicate check (using comparison module)
    const visualDuplicate = store.getAll().find(a => a.assetId !== asset.assetId && a.hashes && compareImages(asset, a).isDuplicate);
    if (visualDuplicate) {
      console.log(`[DedupEngine] Visual duplicate found: ${asset.assetId} -> ${visualDuplicate.assetId}`);
      return asset;
    }

    // 3. Face similarity check (for near-duplicates/bursts)
    if (asset.ai?.faces?.length > 0) {
      const faceDuplicate = store.getAll().find(a => 
        a.assetId !== asset.assetId && 
        a.ai?.faces?.length === asset.ai.faces.length &&
        compareFaceSets(asset.ai.faces, a.ai.faces) > 0.95
      );
      if (faceDuplicate) {
        console.log(`[DedupEngine] Face-based near-duplicate found: ${asset.assetId} -> ${faceDuplicate.assetId}`);
        return asset;
      }
    }
    
    return asset;
  }

  /**
   * Merges a duplicate asset into a primary asset.
   */
  async mergeAssets(primary: Asset, duplicate: Asset, store: AssetStore = assetStore): Promise<Asset> {
    console.log(`[DedupEngine] Merging ${duplicate.assetId} into ${primary.assetId}`);
    // Simplified merge logic
    store.remove(duplicate.assetId);
    return primary;
  }

  /**
   * PART 7E.3 — DUPLICATE GROUP GENERATION
   * Groups assets by similarity threshold using the new cluster module.
   */
  getDuplicateGroups(store: AssetStore = assetStore): DuplicateGroup[] {
    const assets = store.getAll().filter(a => a.culling !== 'trash');
    console.log(`[DedupEngine] getDuplicateGroups: ${assets.length} non-trashed assets found.`);
    
    // Map dam Asset to dedup Asset
    const dedupAssets = assets.map(a => ({
      assetId: a.assetId,
      hashes: a.hashes || { phash: "", dhash: "", whash: "" }, // Ensure hashes exist
      image: { width: a.width, height: a.height },
      metadata: { faces: [] } // Placeholder
    }));

    const clusters = buildClusters(dedupAssets);
    console.log(`[DedupEngine] getDuplicateGroups: ${clusters.length} clusters found.`);

    return clusters.map(cluster => {
      const recommendedAsset = pickBestImage(cluster);
      return {
        groupId: cluster.seed.assetId,
        assetIds: cluster.members.map(m => m.assetId),
        similarityScore: 0.95,
        recommendedAssetId: recommendedAsset.assetId
      };
    });
  }
}

export const dedupEngine = new DedupEngine();
