import { assetStore } from '../dam/assetStore';
import { healthMonitor } from './healthMonitor';

export interface Anomaly {
  id: string;
  type: 'DUPLICATE_GROUP_CONFLICT' | 'ENTITY_EXPLOSION' | 'FAILURE_SPIKE' | 'OUTPUT_DRIFT';
  description: string;
  severity: 'critical' | 'warning';
  timestamp: number;
}

export class AnomalyDetector {
  public detectAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const assets = assetStore.getAll();

    // 1. Same asset in 2 duplicate groups (Stage 0G)
    // We'd need to check the group registry for this
    
    // 2. Entity exploding into too many IDs (Stage 0H)
    for (const asset of assets) {
      if (asset.entityIds && asset.entityIds.length > 50) {
        anomalies.push({
          id: asset.assetId,
          type: 'ENTITY_EXPLOSION',
          description: `Asset ${asset.assetId} has ${asset.entityIds.length} entity links, which is unusually high.`,
          severity: 'warning',
          timestamp: Date.now()
        });
      }
    }

    // 3. Sudden spike in failures (Stage 0I)
    const metrics = healthMonitor.getMetrics();
    if (metrics.pipelineSuccessRate < 80 && metrics.totalProcessed > 10) {
      anomalies.push({
        id: 'SYSTEM',
        type: 'FAILURE_SPIKE',
        description: `Pipeline success rate dropped to ${metrics.pipelineSuccessRate.toFixed(1)}%.`,
        severity: 'critical',
        timestamp: Date.now()
      });
    }

    // 4. Duplicate group mismatch
    const groupLeaders = new Set(assets.map(a => a.groupId).filter(Boolean));
    for (const leaderId of groupLeaders) {
      const leader = assetStore.get(leaderId!);
      if (!leader) {
        anomalies.push({
          id: leaderId!,
          type: 'DUPLICATE_GROUP_CONFLICT',
          description: `Group leader ${leaderId} is missing from the store.`,
          severity: 'critical',
          timestamp: Date.now()
        });
      }
    }

    return anomalies;
  }
}

export const anomalyDetector = new AnomalyDetector();
