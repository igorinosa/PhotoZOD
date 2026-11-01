import { Asset, CullingStatus } from './types';

class Indexer {
  statusIndex: Record<CullingStatus, Set<string>> = {
    keep: new Set<string>(),
    maybe: new Set<string>(),
    trash: new Set<string>(),
    unrated: new Set<string>()
  };

  entityIndex = new Map<string, Set<string>>();
  
  formatIndex: Record<string, Set<string>> = {
    raw: new Set<string>(),
    jpeg: new Set<string>(),
    png: new Set<string>(),
    heic: new Set<string>(),
    unknown: new Set<string>()
  };

  sharpnessIndex = {
    high: new Set<string>(),
    medium: new Set<string>(),
    low: new Set<string>()
  };

  index(asset: Asset) {
    // STATUS
    if (this.statusIndex[asset.culling]) {
      this.statusIndex[asset.culling].add(asset.assetId);
    }

    // ENTITY
    for (const eid of asset.entityIds) {
      if (!this.entityIndex.has(eid)) {
        this.entityIndex.set(eid, new Set());
      }
      this.entityIndex.get(eid)!.add(asset.assetId);
    }

    // FORMAT
    if (this.formatIndex[asset.format]) {
      this.formatIndex[asset.format].add(asset.assetId);
    }

    // SHARPNESS
    if (asset.sharpnessScore !== undefined) {
      if (asset.sharpnessScore >= 0.8) {
        this.sharpnessIndex.high.add(asset.assetId);
      } else if (asset.sharpnessScore >= 0.4) {
        this.sharpnessIndex.medium.add(asset.assetId);
      } else {
        this.sharpnessIndex.low.add(asset.assetId);
      }
    }
  }

  remove(asset: Asset) {
    if (this.statusIndex[asset.culling]) {
      this.statusIndex[asset.culling].delete(asset.assetId);
    }

    for (const eid of asset.entityIds) {
      if (this.entityIndex.has(eid)) {
        this.entityIndex.get(eid)!.delete(asset.assetId);
      }
    }

    if (this.formatIndex[asset.format]) {
      this.formatIndex[asset.format].delete(asset.assetId);
    }

    if (asset.sharpnessScore !== undefined) {
      if (asset.sharpnessScore >= 0.8) {
        this.sharpnessIndex.high.delete(asset.assetId);
      } else if (asset.sharpnessScore >= 0.4) {
        this.sharpnessIndex.medium.delete(asset.assetId);
      } else {
        this.sharpnessIndex.low.delete(asset.assetId);
      }
    }
  }

  clear() {
    this.statusIndex.keep.clear();
    this.statusIndex.maybe.clear();
    this.statusIndex.trash.clear();
    this.statusIndex.unrated.clear();
    this.entityIndex.clear();
    this.formatIndex.raw.clear();
    this.formatIndex.jpeg.clear();
    this.formatIndex.png.clear();
    this.formatIndex.heic.clear();
    this.formatIndex.unknown.clear();
    this.sharpnessIndex.high.clear();
    this.sharpnessIndex.medium.clear();
    this.sharpnessIndex.low.clear();
  }
}

export const indexer = new Indexer();
