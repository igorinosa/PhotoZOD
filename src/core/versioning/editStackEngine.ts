import { EditOperation, Version } from '../../shared/types';
import { versionStore } from './versionStore';
import { assetStore } from '../dam/assetStore';
import { diffEngine } from './diffEngine';

const CHECKPOINT_INTERVAL = 10;

export const editStackEngine = {
  applyEdit: (assetId: string, activeVersionId: string, operation: EditOperation): string => {
    let asset = assetStore.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    // IF asset has batchIds:
    // → DO NOT modify batch
    // → append to localDeltas
    if (asset.batchIds && asset.batchIds.length > 0) {
      const localDeltas = asset.localDeltas || [];
      // Check if we should replace an existing operation of the same type for sliders
      const existingIdx = localDeltas.findIndex(e => e.type === operation.type && ['exposure', 'contrast', 'rotate'].includes(operation.type));
      let newDeltas = [...localDeltas];
      if (existingIdx >= 0) {
        newDeltas[existingIdx] = operation;
      } else {
        newDeltas.push(operation);
      }
      
      assetStore.update(assetId, {
        localDeltas: newDeltas
      });
      return activeVersionId; // No new version created for local deltas
    }

    const activeVersion = versionStore.getVersion(activeVersionId);
    if (!activeVersion) throw new Error(`Version ${activeVersionId} not found`);

    // Calculate depth to determine if we need a checkpoint
    let depth = 0;
    let curr: Version | undefined = activeVersion;
    while (curr && !curr.isCheckpoint) {
      depth++;
      curr = curr.parentVersionId ? versionStore.getVersion(curr.parentVersionId) : undefined;
    }

    const isCheckpoint = depth >= CHECKPOINT_INTERVAL - 1;
    
    const newVersionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    let checkpointStack: EditOperation[] | undefined = undefined;
    if (isCheckpoint) {
      // Get parent full stack, then apply new operation
      const parentStack = diffEngine.getFullStack(activeVersionId);
      checkpointStack = [...parentStack];
      
      const existingIdx = checkpointStack.findIndex(e => e.type === operation.type && ['exposure', 'contrast', 'rotate'].includes(operation.type));
      if (existingIdx >= 0) {
        checkpointStack[existingIdx] = operation;
      } else {
        checkpointStack.push(operation);
      }
    }

    const newVersion: Version = {
      id: newVersionId,
      assetId,
      parentVersionId: activeVersionId,
      delta: [operation],
      createdAt: Date.now(),
      isSnapshot: false,
      isCheckpoint,
      checkpointStack
    };

    versionStore.addVersion(newVersion);
    
    // Invalidate cache for all descendants of the parent version
    diffEngine.invalidateDescendants(assetId, activeVersionId, newVersion.id);
    
    // Update active version on asset
    asset = assetStore.get(assetId);
    if (asset) {
      assetStore.update(assetId, { ...asset, activeVersionId: newVersion.id });
    }

    return newVersion.id;
  },

  reset: (assetId: string): string | null => {
    const asset = assetStore.get(assetId);
    if (!asset || !asset.baseVersionId) return null;

    assetStore.update(assetId, { ...asset, activeVersionId: asset.baseVersionId });
    return asset.baseVersionId;
  }
};
