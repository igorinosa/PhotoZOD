import { assetStore } from '../dam/assetStore';
import { cleanupOrphanedFaces } from '../face/faceEntityEngine';
import { faceIndex } from '../face/faceIndex';
import { versionStore } from '../versioning/versionStore';

export const trashEngine = {
  moveToTrash: (assetIds: string[]) => {
    const now = Date.now();
    const allAssets = assetStore.getAll();
    const validIds = assetIds.filter(id => {
      const asset = allAssets.find(a => a.assetId === id);
      return asset && !asset.isTrashed;
    });

    if (validIds.length === 0) return;

    const updates = validIds.map(id => ({
      assetId: id,
      updates: { isTrashed: true, trashedAt: now }
    }));
    assetStore.batchUpdate(updates);
  },
  
  restoreFromTrash: (assetIds: string[]) => {
    const allAssets = assetStore.getAll();
    const validIds = assetIds.filter(id => {
      const asset = allAssets.find(a => a.assetId === id);
      return asset && asset.isTrashed;
    });

    if (validIds.length === 0) return;

    const updates = validIds.map(id => ({
      assetId: id,
      updates: { isTrashed: false, trashedAt: undefined }
    }));
    assetStore.batchUpdate(updates);
  },
  
  permanentlyDelete: (assetIds: string[]) => {
    const allAssets = assetStore.getAll();
    const validIds = assetIds.filter(id => {
      const asset = allAssets.find(a => a.assetId === id);
      return asset && asset.isTrashed;
    });

    if (validIds.length < assetIds.length) {
      console.warn(`Attempted to permanently delete ${assetIds.length - validIds.length} non-trashed assets. Ignored.`);
    }

    validIds.forEach(id => {
      assetStore.remove(id);
      faceIndex.removeAsset(id);
      versionStore.deleteVersionsForAsset(id);
    });
    
    // Cleanup orphaned faces and entities
    if (validIds.length > 0) {
      cleanupOrphanedFaces(validIds).catch(err => {
        console.error("Failed to cleanup orphaned faces:", err);
      });
    }
  },
  
  emptyTrash: () => {
    const trashedAssets = assetStore.getAll().filter(a => a.isTrashed);
    const ids = trashedAssets.map(a => a.assetId);
    if (ids.length > 0) {
      console.log(`Emptying trash: Permanently deleted ${ids.length} assets.`);
      trashEngine.permanentlyDelete(ids);
    }
  },
  
  autoDelete: (days: number | null) => {
    if (days === null) return;
    const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
    const trashedAssets = assetStore.getAll().filter(a => a.isTrashed && a.trashedAt && a.trashedAt < threshold);
    const ids = trashedAssets.map(a => a.assetId);
    if (ids.length > 0) {
      console.log(`Auto-deleted ${ids.length} assets from Trash.`);
      trashEngine.permanentlyDelete(ids);
    }
  }
};
