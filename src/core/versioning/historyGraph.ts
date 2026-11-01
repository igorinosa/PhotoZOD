import { Version } from '../../shared/types';
import { versionStore } from './versionStore';
import { assetStore } from '../dam/assetStore';

export const historyGraph = {
  undo: (assetId: string): string | null => {
    const asset = assetStore.get(assetId);
    if (!asset || !asset.activeVersionId) return null;

    const activeVersion = versionStore.getVersion(asset.activeVersionId);
    if (!activeVersion || !activeVersion.parentVersionId) return null; // Can't undo past base

    assetStore.update(assetId, { ...asset, activeVersionId: activeVersion.parentVersionId });
    return activeVersion.parentVersionId;
  },

  redo: (assetId: string): string | null => {
    const asset = assetStore.get(assetId);
    if (!asset || !asset.activeVersionId) return null;

    // Find a child version whose parent is the current active version
    // If there are multiple branches, we might just pick the most recently created one
    const allVersions = versionStore.getVersionsForAsset(assetId);
    const children = allVersions.filter(v => v.parentVersionId === asset.activeVersionId);
    
    if (children.length === 0) return null;

    // Pick the most recent child
    children.sort((a, b) => b.createdAt - a.createdAt);
    const nextVersionId = children[0].id;

    assetStore.update(assetId, { ...asset, activeVersionId: nextVersionId });
    return nextVersionId;
  },

  getHistoryPath: (assetId: string, versionId: string): Version[] => {
    const path: Version[] = [];
    let currentId: string | null = versionId;

    while (currentId) {
      const v = versionStore.getVersion(currentId);
      if (!v) break;
      path.unshift(v);
      currentId = v.parentVersionId;
    }

    return path;
  },

  // Returns the tree structure if needed for advanced UI
  getGraph: (assetId: string) => {
    const versions = versionStore.getVersionsForAsset(assetId);
    // Could build a tree structure here
    return versions;
  }
};
