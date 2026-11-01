import { assetEventBus } from '../events/assetEvents';

export interface HealthMetrics {
  pipelineSuccessRate: number;
  totalProcessed: number;
  totalFailed: number;
  avgProcessingTimeMs: number;
  duplicateDetectionRate: number;
  entityLinkingAccuracy: number;
  lastUpdated: number;
}

export class HealthMonitor {
  private metrics: HealthMetrics = {
    pipelineSuccessRate: 100,
    totalProcessed: 0,
    totalFailed: 0,
    avgProcessingTimeMs: 0,
    duplicateDetectionRate: 0,
    entityLinkingAccuracy: 0,
    lastUpdated: Date.now()
  };

  private processingTimes: number[] = [];

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for pipeline events (Stage 0I)
    assetEventBus.subscribe('PIPELINE_COMPLETE', (_, payload) => {
      this.metrics.totalProcessed++;
      this.updateSuccessRate();
      
      if (payload.duration) {
        this.addProcessingTime(payload.duration);
      }
      this.metrics.lastUpdated = Date.now();
    });

    assetEventBus.subscribe('PIPELINE_FAILED', (_, payload) => {
      this.metrics.totalFailed++;
      this.updateSuccessRate();
      this.metrics.lastUpdated = Date.now();
    });

    // Listen for duplicate detection (Stage 0G)
    assetEventBus.subscribe('DUPLICATE_DETECTED', () => {
      this.metrics.duplicateDetectionRate = (this.metrics.duplicateDetectionRate * 0.9) + 0.1;
      this.metrics.lastUpdated = Date.now();
    });
  }

  private updateSuccessRate() {
    const total = this.metrics.totalProcessed + this.metrics.totalFailed;
    if (total > 0) {
      this.metrics.pipelineSuccessRate = (this.metrics.totalProcessed / total) * 100;
    }
  }

  private addProcessingTime(time: number) {
    this.processingTimes.push(time);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.metrics.avgProcessingTimeMs = sum / this.processingTimes.length;
  }

  public getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  public resetMetrics() {
    this.metrics = {
      pipelineSuccessRate: 100,
      totalProcessed: 0,
      totalFailed: 0,
      avgProcessingTimeMs: 0,
      duplicateDetectionRate: 0,
      entityLinkingAccuracy: 0,
      lastUpdated: Date.now()
    };
    this.processingTimes = [];
  }
}

export const healthMonitor = new HealthMonitor();
