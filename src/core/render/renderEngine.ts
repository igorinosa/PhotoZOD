import { Version, EditOperation, ImportedAsset } from '../../shared/types';
import { versionStore } from '../versioning/versionStore';
import { assetStore } from '../dam/assetStore';
import { diffEngine } from '../versioning/diffEngine';
import { batchStore } from '../versioning/batchStore';

// Simple cache for rendered images
const renderCache = new Map<string, string>(); // cacheKey -> objectUrl
const batchOpsCache = new Map<string, { ops: EditOperation[], updatedAt: number }>();
const pendingRenders = new Map<string, Promise<string | null>>();

export const renderEngine = {
  render: async (assetId: string, versionId: string, transientOps: EditOperation[] = []): Promise<string | null> => {
    const asset = assetStore.get(assetId) as ImportedAsset;
    if (!asset || !asset.file) return null;

    const batchIds = asset.batchIds || [];
    const localDeltas = asset.localDeltas || [];
    
    // Create a robust cache key that includes all layers and batch timestamps
    const batchTimestamps = batchIds.map(id => batchStore.getBatch(id)?.updatedAt || 0).join('_');
    const localKey = localDeltas.length > 0 ? `local_${localDeltas.length}` : 'no_local';
    const transientKey = transientOps.length > 0 ? JSON.stringify(transientOps) : '';
    const cacheKey = transientOps.length > 0 
      ? `transient_${assetId}_${transientKey}` 
      : `${versionId}_${batchIds.join(',')}_${batchTimestamps}_${localKey}`;
    
    // Check cache
    if (renderCache.has(cacheKey) && transientOps.length === 0) {
      return renderCache.get(cacheKey)!;
    }

    // Check if already rendering this asset with this key
    const pendingKey = `${assetId}_${cacheKey}`;
    if (pendingRenders.has(pendingKey)) {
      return pendingRenders.get(pendingKey)!;
    }

    const renderPromise = (async () => {
      try {
        const version = versionStore.getVersion(versionId);
        if (!version) return null;

        const baseStack = diffEngine.getFullStack(versionId);
        
        // Batch edits with simple memoization
        const batchOps: EditOperation[] = [];
        for (const batchId of batchIds) {
          const batch = batchStore.getBatch(batchId);
          if (batch) {
            const cached = batchOpsCache.get(batchId);
            if (cached && cached.updatedAt === batch.updatedAt) {
              batchOps.push(...cached.ops);
            } else {
              batchOpsCache.set(batchId, { ops: batch.operations, updatedAt: batch.updatedAt });
              batchOps.push(...batch.operations);
            }
          }
        }

        const combinedStack = [...baseStack, ...batchOps, ...localDeltas, ...transientOps];
        
        // If no edits, return original preview or file URL
        if (combinedStack.length === 0) {
          const url = asset.previewUrl || URL.createObjectURL(asset.file);
          if (transientOps.length === 0) renderCache.set(cacheKey, url);
          return url;
        }

        // Apply edits using Canvas2D
        return new Promise<string | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(asset.previewUrl);
              return;
            }

            // Default dimensions
            let width = img.width;
            let height = img.height;
            let cropRect = { x: 0, y: 0, width, height };

            // Pre-calculate crop to set canvas size
            for (const op of combinedStack) {
              if (op.type === 'crop') {
                cropRect = op.rect;
                width = cropRect.width;
                height = cropRect.height;
              }
            }

            canvas.width = width;
            canvas.height = height;

            // Apply filters
            let filterString = '';
            let rotation = 0;

            for (const op of combinedStack) {
              if (op.type === 'exposure') {
                const brightness = 1 + (op.value / 100);
                filterString += ` brightness(${brightness})`;
              } else if (op.type === 'contrast') {
                const contrast = 1 + (op.value / 100);
                filterString += ` contrast(${contrast})`;
              } else if (op.type === 'rotate') {
                rotation += (op as any).angle || (op as any).degrees || 0;
              } else if (op.type === 'filter') {
                 if (op.id === 'grayscale') filterString += ' grayscale(100%)';
                 if (op.id === 'sepia') filterString += ' sepia(100%)';
              }
            }

            ctx.filter = filterString.trim() || 'none';

            // Handle rotation and drawing
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            
            // Draw image considering crop
            ctx.drawImage(
              img, 
              cropRect.x, cropRect.y, cropRect.width, cropRect.height,
              -width / 2, -height / 2, width, height
            );
            
            ctx.restore();

            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                if (transientOps.length === 0) {
                  renderCache.set(cacheKey, url);
                }
                resolve(url);
              } else {
                resolve(null);
              }
            }, 'image/jpeg', 0.9);
          };
          img.onerror = () => resolve(null);
          img.src = URL.createObjectURL(asset.file);
        });
      } catch (err) {
        console.error("Render failed", err);
        return null;
      } finally {
        pendingRenders.delete(pendingKey);
      }
    })();

    pendingRenders.set(pendingKey, renderPromise);
    return renderPromise;
  },

  renderToBlob: async (assetId: string, versionId: string): Promise<Blob | null> => {
    const asset = assetStore.get(assetId) as ImportedAsset;
    if (!asset || !asset.file) return null;

    const version = versionStore.getVersion(versionId);
    if (!version) return null;

    const baseStack = diffEngine.getFullStack(versionId);
    
    // Batch edits with memoization
    const batchIds = asset.batchIds || [];
    const batchOps: EditOperation[] = [];
    for (const batchId of batchIds) {
      const batch = batchStore.getBatch(batchId);
      if (batch) {
        const cached = batchOpsCache.get(batchId);
        if (cached && cached.updatedAt === batch.updatedAt) {
          batchOps.push(...cached.ops);
        } else {
          batchOpsCache.set(batchId, { ops: batch.operations, updatedAt: batch.updatedAt });
          batchOps.push(...batch.operations);
        }
      }
    }

    // Local overrides
    const localDeltas = asset.localDeltas || [];

    const combinedStack = [...baseStack, ...batchOps, ...localDeltas];

    // If no edits, return original file
    if (combinedStack.length === 0) {
      return asset.file;
    }

    // Apply edits using Canvas2D
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(asset.file);
          return;
        }

        // Default dimensions
        let width = img.width;
        let height = img.height;
        let cropRect = { x: 0, y: 0, width, height };

        // Pre-calculate crop to set canvas size
        for (const op of combinedStack) {
          if (op.type === 'crop') {
            cropRect = op.rect;
            width = cropRect.width;
            height = cropRect.height;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Apply filters
        let filterString = '';
        let rotation = 0;

        for (const op of combinedStack) {
          if (op.type === 'exposure') {
            const brightness = 1 + (op.value / 100);
            filterString += ` brightness(${brightness})`;
          } else if (op.type === 'contrast') {
            const contrast = 1 + (op.value / 100);
            filterString += ` contrast(${contrast})`;
          } else if (op.type === 'rotate') {
            rotation += (op as any).angle || (op as any).degrees || 0;
          } else if (op.type === 'filter') {
             if (op.id === 'grayscale') filterString += ' grayscale(100%)';
             if (op.id === 'sepia') filterString += ' sepia(100%)';
          }
        }

        ctx.filter = filterString.trim() || 'none';

        // Handle rotation and drawing
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        
        // Draw image considering crop
        ctx.drawImage(
          img, 
          cropRect.x, cropRect.y, cropRect.width, cropRect.height,
          -width / 2, -height / 2, width, height
        );
        
        ctx.restore();

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.95);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(asset.file);
    });
  }
};
