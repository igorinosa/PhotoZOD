import { assetStore } from '../dam/assetStore';
import { dedupEngine } from './dedupEngine';
import { Asset } from '../dam/types';
import { orchestrator, CURRENT_PIPELINE_VERSION } from '../runtime/orchestrator';

/**
 * STAGE 0G.9 — BACKGROUND SCANNER
 * 
 * Periodically scans the asset registry to detect and fix duplicates 
 * that may have slipped through the live import pipeline.
 */
export class BackgroundScanner {
  private intervalId: any = null;
  private isScanning = false;

  /**
   * Starts the background scanner.
   * @param intervalMinutes Frequency of scans.
   */
  start(intervalMinutes = 15) {
    if (this.intervalId) return;

    console.log(`[BackgroundScanner] Starting scanner (every ${intervalMinutes} minutes)`);
    this.intervalId = setInterval(() => this.scan(), intervalMinutes * 60 * 1000);
    
    // Initial scan after a short delay
    setTimeout(() => this.scan(), 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Scans the entire asset registry for duplicates.
   */
  async scan(force: boolean = false) {
    if (this.isScanning) {
      console.log('[BackgroundScanner] Already scanning, skipping...');
      return;
    }
    this.isScanning = true;

    console.log('[BackgroundScanner] Starting registry scan...');
    const assets = assetStore.getAll();
    console.log(`[BackgroundScanner] Assets found: ${assets.length}`);
    const total = assets.length;
    let fixed = 0;

    console.log(`[BackgroundScanner] Starting registry scan for version ${CURRENT_PIPELINE_VERSION}...`);

    // PART 0G.13: Performance Strategy - Small Batches
    const batchSize = 50;
    for (let i = 0; i < total; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      for (const asset of batch) {
        // Check if asset still exists (might have been merged in this scan)
        if (!assetStore.get(asset.assetId)) continue;

        try {
          // Check for outdated pipeline version (PART 0F.14: Version Migration)
          if (force || asset.pipelineVersion !== CURRENT_PIPELINE_VERSION) {
            console.log(`[BackgroundScanner] [${i + batch.indexOf(asset) + 1}/${total}] Reprocessing ${asset.assetId} (${asset.pipelineVersion} -> ${CURRENT_PIPELINE_VERSION})`);
            await orchestrator.reprocessAsset(asset.assetId);
            fixed++;
            continue;
          }

          const result = await dedupEngine.runDeduplication(asset);
          if (result.assetId !== asset.assetId) {
            fixed++;
          }
        } catch (error) {
          console.error(`[BackgroundScanner] Error scanning ${asset.assetId}:`, error);
        }
      }

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    console.log(`[BackgroundScanner] Scan complete. Total: ${total}, Fixed/Reprocessed: ${fixed}`);
    this.isScanning = false;
  }
}

export const backgroundScanner = new BackgroundScanner();
