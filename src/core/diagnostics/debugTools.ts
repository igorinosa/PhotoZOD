import { assetStore } from '../dam/assetStore';
import { assetValidator } from './validator';
import { reprocessEngine } from '../reprocess/reprocessEngine';

export interface AssetDebugInfo {
  assetId: string;
  path: string;
  visualHash: string | undefined;
  seed: string | undefined;
  groupId: string | undefined;
  pipelineState: any;
  validationResult: any;
  entityIds: string[];
}

export class DebugTools {
  public debugAsset(assetId: string): AssetDebugInfo | null {
    const asset = assetStore.get(assetId);
    if (!asset) return null;

    const validationResult = assetValidator.validate(assetId);

    return {
      assetId: asset.assetId,
      path: asset.path,
      visualHash: asset.visualHash,
      seed: asset.seed,
      groupId: asset.groupId,
      pipelineState: asset.pipelineState,
      validationResult,
      entityIds: asset.entityIds || []
    };
  }

  public async replayPipelineStep(assetId: string): Promise<void> {
    // Replay pipeline step-by-step
    // For now, we just trigger a reprocess
    await reprocessEngine.reprocessAsset(assetId);
  }

  public compareBeforeAfter(assetId: string, beforeState: any, afterState: any): any {
    // Compare before and after states
    // This would be used during debugging to see what changed
    const changes: any = {};
    for (const key in afterState) {
      if (JSON.stringify(beforeState[key]) !== JSON.stringify(afterState[key])) {
        changes[key] = {
          before: beforeState[key],
          after: afterState[key]
        };
      }
    }
    return changes;
  }
}

export const debugTools = new DebugTools();
