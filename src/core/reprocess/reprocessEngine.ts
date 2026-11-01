import { assetStore, ensureAssetShape } from '../dam/assetStore';
import { orchestrator, CURRENT_PIPELINE_VERSION } from '../runtime/orchestrator';
import { Asset } from '../dam/types';
import { assetEventBus } from '../events/assetEvents';
import { systemDB } from '../storage/db';

export interface ReprocessProgress {
  total: number;
  processed: number;
  failed: number;
  currentAssetId?: string;
}

export interface ReprocessOptions {
  priority?: 'high' | 'normal' | 'low';
  dryRun?: boolean;
  force?: boolean; // Reprocess even if version matches
}

export interface DryRunReport {
  assetId: string;
  changes: string[];
}

export class ReprocessEngine {
  private isRunning = false;
  private progress: ReprocessProgress = { total: 0, processed: 0, failed: 0 };
  private dryRunReports: DryRunReport[] = [];

  public async reprocessAll(options: ReprocessOptions = {}): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.dryRunReports = [];

    let assets = assetStore.getAll();
    
    // CRITICAL: Rebuild all existing assets to enforce schema
    console.log("[ReprocessEngine] Enforcing asset schema across all assets...");
    for (const asset of assets) {
      const safeAsset = ensureAssetShape(asset);
      assetStore.update(safeAsset.assetId, safeAsset);
      await systemDB.saveAsset(safeAsset);
    }
    console.log("[ReprocessEngine] Schema enforcement complete.");

    // Priority Sorting (0K.8)
    if (options.priority) {
      assets = this.sortAssetsByPriority(assets);
    }

    const toProcess = options.force 
      ? assets 
      : assets.filter(a => a.pipelineVersion !== CURRENT_PIPELINE_VERSION);

    this.progress = { total: toProcess.length, processed: 0, failed: 0 };
    this.notifyProgress();

    for (const asset of toProcess) {
      try {
        this.progress.currentAssetId = asset.assetId;
        this.notifyProgress();

        if (options.dryRun) {
          const report = await this.simulateReprocess(asset);
          this.dryRunReports.push(report);
        } else {
          await orchestrator.reprocessAsset(asset.assetId);
        }

        this.progress.processed++;
      } catch (err) {
        console.error(`[ReprocessEngine] Failed to reprocess ${asset.assetId}:`, err);
        this.progress.failed++;
      } finally {
        this.notifyProgress();
      }
    }

    this.isRunning = false;
    this.progress.currentAssetId = undefined;
    this.notifyProgress();
    
    if (options.dryRun) {
      console.log('[ReprocessEngine] Dry run complete. Reports:', this.dryRunReports);
    }
  }

  public async reprocessAsset(assetId: string): Promise<void> {
    await orchestrator.reprocessAsset(assetId);
  }

  public async reprocessGroup(groupId: string): Promise<void> {
    const assets = assetStore.getAll().filter(a => a.groupId === groupId);
    for (const asset of assets) {
      await orchestrator.reprocessAsset(asset.assetId);
    }
  }

  public async retryFailedAssets(): Promise<void> {
    const failedAssets = assetStore.getAll().filter(a => a.importStatus === 'failed');
    this.progress = { total: failedAssets.length, processed: 0, failed: 0 };
    this.notifyProgress();
    
    for (const asset of failedAssets) {
      try {
        await orchestrator.reprocessAsset(asset.assetId);
        this.progress.processed++;
      } catch (err) {
        this.progress.failed++;
      } finally {
        this.notifyProgress();
      }
    }
  }

  public async validateSystem(): Promise<{ errors: string[], fixed: number }> {
    const errors: string[] = [];
    let fixed = 0;
    const assets = assetStore.getAll();
    const assetIds = new Set(assets.map(a => a.assetId));

    for (const asset of assets) {
      // 1. Check duplicate group consistency
      if (asset.groupId && !assetIds.has(asset.groupId)) {
        errors.push(`Asset ${asset.assetId} has invalid groupId ${asset.groupId}`);
        asset.groupId = asset.assetId; // Auto-fix: point to self
        fixed++;
      }

      // 2. Check entity links
      const validEntityIds = asset.entityIds.filter(id => {
        // We'd need an entityStore to check this properly
        return true; 
      });
      if (validEntityIds.length !== asset.entityIds.length) {
        errors.push(`Asset ${asset.assetId} has broken entity links`);
        asset.entityIds = validEntityIds;
        fixed++;
      }
    }

    return { errors, fixed };
  }

  private notifyProgress() {
    assetEventBus.emit('REPROCESS_PROGRESS', { ...this.progress });
  }

  public getProgress(): ReprocessProgress {
    return { ...this.progress };
  }

  private sortAssetsByPriority(assets: Asset[]): Asset[] {
    // Priority logic (0K.8)
    // 1. Currently viewed asset (we'd need to know this from UI state)
    // 2. Visible assets
    // 3. Recently used assets
    // 4. Background assets
    
    // For now, let's just sort by updatedAt descending as a proxy for "recently used"
    return [...assets].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private async simulateReprocess(asset: Asset): Promise<DryRunReport> {
    // Dry run logic: compare what would change
    const changes: string[] = [];
    
    // Simulate some changes based on current version
    if (asset.pipelineVersion !== CURRENT_PIPELINE_VERSION) {
      changes.push(`Update pipeline version from ${asset.pipelineVersion} to ${CURRENT_PIPELINE_VERSION}`);
      changes.push('Recalculate normalization (0C)');
      changes.push('Recalculate visual hash (0B)');
      changes.push('Re-evaluate duplicate grouping (0G)');
    }

    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
    return { assetId: asset.assetId, changes };
  }

  public getDryRunReports(): DryRunReport[] {
    return this.dryRunReports;
  }
}

export const reprocessEngine = new ReprocessEngine();
