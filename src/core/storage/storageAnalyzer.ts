import { Asset } from '../dam/types';
import { StorageAnalysis } from './storageTypes';

class StorageAnalyzer {
  private cache: {
    analysis: StorageAnalysis | null;
    lastAssetCount: number;
    lastUpdate: number;
  } = {
    analysis: null,
    lastAssetCount: 0,
    lastUpdate: 0
  };

  analyze(assets: Asset[]): StorageAnalysis {
    // Basic cache check
    if (this.cache.analysis && this.cache.lastAssetCount === assets.length) {
      // Check if any asset was updated (this is a bit more expensive, maybe just use length + timestamp)
      // For now, length is a good proxy for import/delete.
      // For batch updates, we might need a more robust cache key.
      return this.cache.analysis;
    }

    const start = performance.now();
    
    const analysis: StorageAnalysis = {
      totalSize: 0,
      byFormat: {},
      byDate: {},
      byFolder: {},
      byCulling: {
        picked: 0,
        rejected: 0,
        unflagged: 0
      }
    };

    for (const asset of assets) {
      const size = asset.fileSize || asset.size || 0;
      
      // Drift protection: skip if missing or invalid size
      if (size <= 0) {
        if (asset.assetId) {
          console.warn(`StorageAnalyzer: Skipping asset ${asset.assetId} due to invalid size: ${size}`);
        }
        continue;
      }

      analysis.totalSize += size;

      // By Format
      const format = asset.format || 'unknown';
      analysis.byFormat[format] = (analysis.byFormat[format] || 0) + size;

      // By Date (Year)
      const date = new Date(asset.createdAt);
      const year = date.getFullYear().toString();
      analysis.byDate[year] = (analysis.byDate[year] || 0) + size;

      // By Folder (First part of path)
      const folder = this.getFolderName(asset.path);
      analysis.byFolder[folder] = (analysis.byFolder[folder] || 0) + size;

      // By Culling
      if (asset.pickStatus === 'picked') {
        analysis.byCulling.picked += size;
      } else if (asset.pickStatus === 'rejected') {
        analysis.byCulling.rejected += size;
      } else {
        analysis.byCulling.unflagged += size;
      }
    }

    const end = performance.now();
    console.log(`Storage analysis took ${end - start}ms for ${assets.length} assets.`);

    this.cache = {
      analysis,
      lastAssetCount: assets.length,
      lastUpdate: Date.now()
    };

    return analysis;
  }

  private getFolderName(path: string): string {
    if (!path) return 'Root';
    const parts = path.split('/');
    if (parts.length <= 1) return 'Root';
    return parts[0];
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  invalidate() {
    this.cache.analysis = null;
  }
}

export const storageAnalyzer = new StorageAnalyzer();
