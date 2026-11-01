import { useImportQueue, ImportJob } from '../../dam/import/importQueue';
import { generateFingerprint } from '../identity/fingerprint';
import { assetStore } from '../../dam/assetStore';
import { resolveFolderPath, resolveFilename } from '../../dam/import/folderResolver';
import { DEFAULT_PRESET } from '../../dam/import/importPresets';
import { verifyFile } from '../../dam/import/integrity';
import { fsManager } from '../../fs/fileSystem';
import { orchestrator } from '../../runtime/orchestrator';
import { importState } from './importState';

const MAX_CONCURRENT = 3;

function classifyError(err: any): string {
  if (!err) return "unknown_error";
  const msg = err.message || String(err);
  if (msg.includes("checksum")) return "checksum_failed";
  if (msg.includes("write")) return "write_failed";
  if (msg.includes("decode")) return "decode_failed";
  return "unknown_error";
}

class ImportOrchestrator {
  private isRunning = false;
  private activeJobs = new Set<string>();

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Crash Recovery (Bootloader Fix)
    const state = useImportQueue.getState();
    for (const job of state.jobs) {
      if (job.status === 'processing' || job.status === 'ingesting') {
        useImportQueue.getState().updateJob(job.id, { status: 'paused' });
      }
    }

    this.loop();
  }

  private async loop() {
    while (true) {
      const state = useImportQueue.getState();
      
      if (this.activeJobs.size >= MAX_CONCURRENT) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      const jobToStart = state.jobs.find(j => 
        (j.status === 'pending' || j.status === 'processing') && 
        !this.activeJobs.has(j.id) &&
        !j.requiresDecision &&
        j.processedCount < j.totalCount
      );

      if (jobToStart) {
        this.activeJobs.add(jobToStart.id);
        this.processJob(jobToStart.id).finally(() => {
          this.activeJobs.delete(jobToStart.id);
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  private async processJob(jobId: string) {
    while (true) {
      const state = useImportQueue.getState();
      const job = state.jobs.find(j => j.id === jobId);
      
      if (!job || job.status === 'paused' || job.status === 'cancelled' || job.status === 'failed') {
        return;
      }

      if (job.requiresDecision) {
        if (!job.decision) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        if (job.decision === 'skip') {
          const newProcessed = job.processedCount + 1;
          useImportQueue.getState().updateJob(job.id, { 
            requiresDecision: false, 
            decision: undefined,
            status: 'processing',
            processedCount: newProcessed,
            summary: { ...job.summary, skipped: job.summary.skipped + 1 }
          });
          useImportQueue.getState().updateProgress(job.id, newProcessed, job.totalCount);
          continue;
        }

        if (job.decision === 'replace') {
          if (job.duplicateOf) {
            assetStore.remove(job.duplicateOf);
          }
          useImportQueue.getState().updateJob(job.id, { requiresDecision: false, decision: undefined, status: 'processing' });
        }

        if (job.decision === 'keep') {
          useImportQueue.getState().updateJob(job.id, { requiresDecision: false, decision: undefined, status: 'processing' });
        }
        
        continue;
      }

      if (job.processedCount >= job.totalCount) {
        useImportQueue.getState().completeJob(job.id);
        return;
      }

      const fileIndex = job.processedCount;
      const file = job.files[fileIndex];

      if (!file) {
        useImportQueue.getState().failJob(job.id, 'File reference lost');
        useImportQueue.getState().cancelJob(job.id);
        return;
      }

      try {
        const requiresDecision = await this.processFile(job, file, fileIndex);
        
        if (requiresDecision) {
          continue;
        }
        
        const updatedJob = useImportQueue.getState().jobs.find(j => j.id === jobId);
        if (updatedJob) {
           const newProcessed = updatedJob.processedCount + 1;
           useImportQueue.getState().updateJob(job.id, { 
             processedCount: newProcessed,
             summary: { ...updatedJob.summary, completed: updatedJob.summary.completed + 1 }
           });
           useImportQueue.getState().updateProgress(job.id, newProcessed, job.totalCount);
        }
      } catch (error: any) {
        importState.failed++;
        importState.notify();
        const errType = classifyError(error);
        useImportQueue.getState().updateJob(job.id, { errorType: errType });
        useImportQueue.getState().failJob(job.id, error.message || 'Unknown error');
        
        const updatedJob = useImportQueue.getState().jobs.find(j => j.id === jobId);
        if (updatedJob) {
          const newProcessed = updatedJob.processedCount + 1;
          useImportQueue.getState().updateJob(job.id, {
            processedCount: newProcessed,
            summary: { ...updatedJob.summary, failed: updatedJob.summary.failed + 1 }
          });
          useImportQueue.getState().updateProgress(job.id, newProcessed, job.totalCount);
        }
      }
    }
  }

  private async processFile(job: ImportJob, file: File, index: number): Promise<boolean> {
    useImportQueue.getState().updateJob(job.id, { 
      status: 'ingesting',
      progressDetail: { stage: 'checksum', percent: 0 }
    });

    const checksum = await generateFingerprint(file);

    const existingAsset = assetStore.get(checksum);
    if (existingAsset && !job.decision) {
      useImportQueue.getState().updateJob(job.id, {
        status: 'duplicate',
        duplicateOf: existingAsset.assetId,
        requiresDecision: true,
        summary: { ...job.summary, duplicates: job.summary.duplicates + 1 }
      });
      return true;
    }

    useImportQueue.getState().updateJob(job.id, { 
      progressDetail: { stage: 'write', percent: 50 }
    });

    const preset = DEFAULT_PRESET;
    const folderPath = resolveFolderPath(file, preset);
    const newFilename = resolveFilename(file, preset, index);
    const fullPath = `${folderPath}${newFilename}`;

    await fsManager.requestAccess();
    let safeFilename = fullPath.replace(/\//g, '_').replace(/^_/, '');
    
    try {
      const existingFiles = await fsManager.getAllFiles();
      let counter = 1;
      const originalSafeFilename = safeFilename;
      const extIndex = originalSafeFilename.lastIndexOf('.');
      const namePart = extIndex !== -1 ? originalSafeFilename.substring(0, extIndex) : originalSafeFilename;
      const extPart = extIndex !== -1 ? originalSafeFilename.substring(extIndex) : '';

      while (existingFiles.some(f => f.name === safeFilename)) {
        safeFilename = `${namePart}_${counter}${extPart}`;
        counter++;
      }
    } catch (e) {}

    await fsManager.writeFile(safeFilename, file);

    const writtenFile = await fsManager.readFile(safeFilename);
    const isIntact = await verifyFile(writtenFile, checksum);
    if (!isIntact) {
      throw new Error(`Integrity check failed for ${file.name}`);
    }

    useImportQueue.getState().updateJob(job.id, { 
      progressDetail: { stage: 'process', percent: 75 }
    });

    const importedAsset = await orchestrator.processAsset(file, (progress) => {
      importState.updateProgress(progress);
    });

    if (importedAsset) {
      importedAsset.path = safeFilename;
      importedAsset.fileName = newFilename;
      assetStore.update(importedAsset.assetId, { path: safeFilename, fileName: newFilename });
      
      importState.processed++;
      importState.notifyAsset(importedAsset);
    }
    
    useImportQueue.getState().updateJob(job.id, { status: 'processing' });
    return false;
  }
}

export const importOrchestrator = new ImportOrchestrator();
