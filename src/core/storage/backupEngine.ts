import { Asset } from '../dam/types';
import { assetStore } from '../dam/assetStore';
import { BackupDestination, BackupProgress } from './storageTypes';

type ProgressCallback = (progress: BackupProgress) => void;

class BackupEngine {
  private activeProgress: BackupProgress | null = null;
  private callbacks: Set<ProgressCallback> = new Set();
  private isPaused = false;
  private failedIds: string[] = [];
  private currentJob: {
    id: string;
    assetIds: string[];
    destination: BackupDestination;
    startedAt: number;
    timeoutMs: number;
  } | null = null;

  constructor() {
    this.loadPersistedJob();
  }

  private loadPersistedJob() {
    const saved = localStorage.getItem('dam_backup_job');
    if (saved) {
      try {
        const job = JSON.parse(saved);
        if (job.status === 'running' || job.status === 'paused') {
          this.currentJob = {
            id: job.id,
            assetIds: job.assetIds || [],
            destination: job.destination,
            startedAt: job.startedAt,
            timeoutMs: job.timeoutMs || 30 * 60 * 1000
          };
          this.activeProgress = {
            total: job.total,
            processed: job.processed,
            success: job.success,
            failed: job.failed,
            isComplete: false,
            isPaused: job.status === 'paused',
            startedAt: job.startedAt
          };
          this.failedIds = job.failedIds || [];
        }
      } catch (e) {
        console.error('Failed to load persisted backup job', e);
      }
    }
  }

  private persistJob(status: 'running' | 'paused' | 'complete' | 'failed' | 'timed_out') {
    if (!this.currentJob || !this.activeProgress) {
      localStorage.removeItem('dam_backup_job');
      return;
    }

    const jobData = {
      id: this.currentJob.id,
      status,
      destination: this.currentJob.destination,
      total: this.activeProgress.total,
      processed: this.activeProgress.processed,
      success: this.activeProgress.success,
      failed: this.activeProgress.failed,
      assetIds: this.currentJob.assetIds,
      failedIds: this.failedIds,
      startedAt: this.currentJob.startedAt,
      timeoutMs: this.currentJob.timeoutMs
    };

    localStorage.setItem('dam_backup_job', JSON.stringify(jobData));
  }

  subscribe(callback: ProgressCallback) {
    this.callbacks.add(callback);
    if (this.activeProgress) callback(this.activeProgress);
    return () => this.callbacks.delete(callback);
  }

  private emit(progress: BackupProgress) {
    // Calculate speed and ETA
    if (progress.startedAt && progress.processed > 0) {
      const elapsedSeconds = (Date.now() - progress.startedAt) / 1000;
      if (elapsedSeconds > 0) {
        progress.speed = Number((progress.processed / elapsedSeconds).toFixed(2));
        const remaining = progress.total - progress.processed;
        progress.eta = Math.round(remaining / progress.speed);
      }
    }

    this.activeProgress = progress;
    this.callbacks.forEach(cb => cb(progress));
  }

  async runBackup(assetIds: string[], destination: BackupDestination, timeoutMs = 30 * 60 * 1000) {
    this.isPaused = false;
    this.failedIds = [];
    const startedAt = Date.now();
    
    this.currentJob = {
      id: Math.random().toString(36).substr(2, 9),
      assetIds,
      destination,
      startedAt,
      timeoutMs
    };

    const progress: BackupProgress = {
      total: assetIds.length,
      processed: 0,
      success: 0,
      failed: 0,
      isComplete: false,
      isPaused: false,
      startedAt
    };

    this.emit(progress);
    this.persistJob('running');

    const BATCH_SIZE = 100;
    for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
      // Check for timeout
      if (Date.now() - startedAt > timeoutMs) {
        progress.isTimedOut = true;
        this.emit({ ...progress });
        this.persistJob('timed_out');
        return;
      }

      if (this.isPaused) {
        progress.isPaused = true;
        this.emit({ ...progress });
        this.persistJob('paused');
        return;
      }

      const batch = assetIds.slice(i, i + BATCH_SIZE);
      await this.processBatch(batch, destination, progress);
      this.emit({ ...progress });
      this.persistJob('running');
      
      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    progress.isComplete = true;
    this.emit({ ...progress });
    this.persistJob('complete');
  }

  private async processBatch(assetIds: string[], destination: BackupDestination, progress: BackupProgress) {
    for (const id of assetIds) {
      try {
        // Simulate backup logic (in a real app, this would be file transfer)
        // We'll simulate a small delay and a 1% failure rate
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (Math.random() < 0.01) {
          throw new Error('Simulated backup failure');
        }

        const asset = assetStore.get(id);
        if (asset) {
          const newStatus = { ...asset.backupStatus };
          if (destination === 'external') newStatus.external = true;
          if (destination === 'cloud') newStatus.cloud = true;
          
          assetStore.update(id, {
            backupStatus: newStatus,
            lastBackupAt: Date.now()
          });
        }
        
        progress.success++;
      } catch (error) {
        console.error(`Backup failed for asset ${id}:`, error);
        progress.failed++;
        this.failedIds.push(id);
      } finally {
        progress.processed++;
      }
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume(assetIds: string[], destination: BackupDestination) {
    const remainingIds = assetIds.slice(this.activeProgress?.processed || 0);
    return this.runBackup(remainingIds, destination);
  }

  getFailedIds() {
    return this.failedIds;
  }

  retryFailed(destination: BackupDestination) {
    const idsToRetry = [...this.failedIds];
    return this.runBackup(idsToRetry, destination);
  }

  discardJob() {
    this.currentJob = null;
    this.activeProgress = null;
    this.failedIds = [];
    this.persistJob('complete'); // Removes from localStorage
  }

  getActiveProgress() {
    return this.activeProgress;
  }

  getPersistedJob() {
    const saved = localStorage.getItem('dam_backup_job');
    if (!saved) return null;
    try {
      const job = JSON.parse(saved);
      if (job.status === 'running' || job.status === 'paused') return job;
    } catch (e) {
      return null;
    }
    return null;
  }
}

export const backupEngine = new BackupEngine();
