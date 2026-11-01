import { versionStore } from './versionStore';
import { diffEngine } from './diffEngine';

export const snapshotManager = {
  createSnapshot: (versionId: string, name: string): string | null => {
    const version = versionStore.getVersion(versionId);
    if (!version) return null;

    // We can either mark the current version as a snapshot, or create a new node
    // Creating a new node is safer so it doesn't get lost if we undo/redo and prune (though we don't prune)
    // Let's just create a new version that is identical but marked as snapshot
    
    const snapshotVersion = {
      ...version,
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      parentVersionId: version.id, // Link it to the version it was created from
      delta: [], // Snapshots don't introduce new edits
      name,
      isSnapshot: true,
      createdAt: Date.now()
    };

    versionStore.addVersion(snapshotVersion);
    
    // Invalidate cache for descendants
    diffEngine.invalidateDescendants(version.assetId, version.id, snapshotVersion.id);
    
    return snapshotVersion.id;
  },

  getSnapshots: (assetId: string) => {
    return versionStore.getVersionsForAsset(assetId).filter(v => v.isSnapshot);
  }
};
