import { assetStore } from '../dam/assetStore';
import { ImportedAsset } from '../pipeline/import/importManagerTypes';
import { generateName, resolveCollision } from './generator';

export interface RenameOperation {
  assetId: string;
  oldName: string;
  newName: string;
}

export interface RenameHistory {
  timestamp: number;
  operations: RenameOperation[];
}

class RenameManager {
  private history: RenameHistory[] = [];

  /**
   * 🧩 PART 7F.7 — PREVIEW SYSTEM
   * Generate a preview of what the new names will be.
   */
  generatePreview(
    assets: ImportedAsset[], 
    pattern: string, 
    custom: string = ""
  ): RenameOperation[] {
    const allAssets = assetStore.getAll();
    const assetsToRenameIds = new Set(assets.map(a => a.assetId));
    
    // Names of assets NOT in this batch are "fixed"
    const collisionSet = new Set<string>();
    allAssets.forEach(a => {
      if (!assetsToRenameIds.has(a.assetId)) {
        collisionSet.add(a.fileName);
      }
    });

    const preview: RenameOperation[] = [];
    
    assets.forEach((asset, index) => {
      let newName = generateName(pattern, asset, index + 1, custom);
      
      // Resolve collisions against fixed names and names already assigned in this batch
      newName = resolveCollision(newName, collisionSet);
      
      // Add the resolved name to the collision set for the next items in this batch
      collisionSet.add(newName);
      
      preview.push({
        assetId: asset.assetId,
        oldName: asset.fileName,
        newName: newName
      });
    });

    return preview;
  }

  /**
   * 🧩 PART 7F.8 — APPLY RENAME (SAFE MODE)
   * Apply the rename operations to the virtual registry.
   */
  applyRename(operations: RenameOperation[]) {
    if (operations.length === 0) return;

    // 🧩 PART 7F.9 — UNDO SYSTEM
    // Save to history before applying
    this.history.push({
      timestamp: Date.now(),
      operations: [...operations]
    });

    // Apply updates to asset store in batch
    const updates = operations.map(op => ({
      assetId: op.assetId,
      updates: { fileName: op.newName }
    }));
    
    assetStore.batchUpdate(updates);
  }

  /**
   * 🧩 PART 7F.9 — UNDO SYSTEM
   * Revert the last rename operation.
   */
  undo() {
    const lastBatch = this.history.pop();
    if (!lastBatch) return;

    const updates = lastBatch.operations.map(op => ({
      assetId: op.assetId,
      updates: { fileName: op.oldName }
    }));
    
    assetStore.batchUpdate(updates);
  }

  getHistory() {
    return this.history;
  }
}

export const renameManager = new RenameManager();
