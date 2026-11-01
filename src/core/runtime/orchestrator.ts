import { Asset, PipelineState, ImportedAsset, ImportProgress, ProcessOptions, Version } from '../../shared/types';
import { generateFingerprint } from '../pipeline/identity/fingerprint';
import { extractMetadata } from '../pipeline/import/metadataExtractor';
import { decodeFile } from '../pipeline/import/decoderBridge';
import { orientationFixer } from '../pipeline/import/orientation';
import { colorManagement } from '../engines/color/lcms';
import { generatePreview } from '../pipeline/import/preview';
import { normalizeImage } from '../pipeline/identity/normalization';
import { computeMultiHash } from '../hash/multiHash';
import { compareImages } from '../hash/comparison';
import { storeAsset } from '../cache/assetStore';
import { assetStore } from '../dam/assetStore';
import { indexer } from '../dam/indexer';
import { triggerAI } from '../pipeline/import/aiTrigger';
import { dedupEngine } from '../dedup/dedupEngine';
import { assetEventBus } from '../events/assetEvents';
import { previewCache } from '../cache/previewCache';
import { opfsManager } from '../storage/opfs';
import { settingsManager } from '../state/settingsManager';
import { pipelineLogger } from '../logs/pipelineLogger';
import { systemDB } from '../storage/db';
import { detectFaces } from '../ai/vision/mediapipe';
import { versionStore } from '../versioning/versionStore';

export const CURRENT_PIPELINE_VERSION = '1.0.8';

export class PipelineOrchestrator {
  private activeJobs = new Map<string, Promise<ImportedAsset>>();
  private queue: Array<() => Promise<void>> = [];
  private concurrencyLimit = 4;
  private runningCount = 0;

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.runningCount--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.runningCount < this.concurrencyLimit && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        this.runningCount++;
        task();
      }
    }
  }

  private createInitialState(): PipelineState {
    return {
      identity: 'pending',
      normalized: 'pending',
      hashed: 'pending',
      grouped: 'pending',
      seeded: 'pending',
      validated: 'pending',
      deduped: 'pending',
      entityLinked: 'pending',
    };
  }

  private log(assetId: string, message: string) {
    pipelineLogger.log(assetId, message);
  }

  private fail(asset: Asset, step: keyof PipelineState, error: any) {
    asset.pipelineState[step] = 'failed';
    asset.importStatus = 'failed';
    asset.importError = error instanceof Error ? error.message : String(error);
    pipelineLogger.error(asset.assetId, `FAILED at ${step}`, error);
    assetEventBus.emit('ASSET_METADATA_CHANGED', asset);
  }

  public async processAsset(
    file: File, 
    onProgress?: (progress: ImportProgress) => void,
    options: ProcessOptions = {}
  ): Promise<ImportedAsset> {
    const fileName = file.name;
    const filePath = file.webkitRelativePath || file.name;

    // 1. Identity (0A) - Fingerprint
    onProgress?.({ fileName, status: 'Parsing Metadata', progress: 5 });
    const assetId = await generateFingerprint(file);
    if (!assetId) throw new Error('Failed to generate assetId');

    // Idempotency / Concurrency check
    if (this.activeJobs.has(assetId)) {
      this.log(assetId, 'Already processing, waiting for existing job...');
      return this.activeJobs.get(assetId)!;
    }

    const job = this.enqueue(() => this._runPipeline(assetId, file, fileName, filePath, onProgress, options));
    this.activeJobs.set(assetId, job);

    try {
      const result = await job;
      return result;
    } finally {
      this.activeJobs.delete(assetId);
    }
  }

  public async reprocessAsset(assetId: string, file?: File, onProgress?: (progress: ImportProgress) => void): Promise<ImportedAsset> {
    this.log(assetId, 'Reprocessing asset...');
    const existingAsset = assetStore.get(assetId);
    if (!existingAsset) throw new Error(`Asset ${assetId} not found for reprocessing`);

    // Reset derived data but keep user work
    existingAsset.pipelineState = this.createInitialState();
    existingAsset.importStatus = 'processing';
    existingAsset.importError = undefined;

    // If file not provided, try to fetch from OPFS
    if (!file) {
      const blob = await opfsManager.getFile(assetId, 'original');
      if (!blob) throw new Error(`Original file for ${assetId} not found in storage`);
      file = new File([blob], existingAsset.fileName, { type: 'image/jpeg' }); // Type might be wrong but decoder handles it
    }

    return this.processAsset(file, onProgress);
  }

  private async _runPipeline(
    assetId: string, 
    file: File, 
    fileName: string, 
    filePath: string,
    onProgress?: (progress: ImportProgress) => void,
    options: ProcessOptions = {}
  ): Promise<ImportedAsset> {
    this.log(assetId, 'Starting pipeline');

    const store = options.store || assetStore;

    // Check if asset exists
    let asset = store.get(assetId);
    let isNew = !asset;

    if (!asset) {
      const baseVersionId = `v_base_${assetId}`;
      const baseVersion: Version = {
        id: baseVersionId,
        assetId,
        parentVersionId: null,
        delta: [],
        createdAt: Date.now(),
        name: 'Original',
        isSnapshot: true
      };
      versionStore.addVersion(baseVersion);

      asset = {
        assetId,
        path: filePath,
        duplicatePaths: [],
        fileName,
        format: 'unknown',
        size: file.size,
        createdAt: file.lastModified,
        updatedAt: Date.now(),
        importedAt: Date.now(),
        baseVersionId,
        activeVersionId: baseVersionId,
        exif: {},
        entityIds: [],
        culling: 'maybe',
        rating: null,
        colorTag: null,
        pickStatus: 'unflagged',
        isTrashed: false,
        trashedAt: null,
        importStatus: 'processing',
        pipelineState: this.createInitialState(),
        pipelineVersion: CURRENT_PIPELINE_VERSION,
        qualityScore: 0.5,
        duplicateGroupId: null,
        ai: {
          faces: [],
          sceneType: 'unknown',
          tags: []
        }
      };
      store.add(asset);
    } else {
      // 0K.1: Identity Stability - assetId is preserved
      // 0K.2: Decision Stability - culling, rating, colorTag are preserved
      // 0K.3: Edit Stability - photocode is preserved
      
      // Duplicate handling
      const duplicatePaths = asset.duplicatePaths || [];
      if (asset.path !== filePath && !duplicatePaths.includes(filePath)) {
        asset.duplicatePaths = [...duplicatePaths, filePath];
        assetEventBus.emit('ASSET_DELETED', assetId); // Notify change
      }
      
      // If already valid and fully processed AND version matches, just return it
      if (asset.importStatus === 'valid' && 
          asset.pipelineState.entityLinked === 'done' && 
          asset.pipelineVersion === CURRENT_PIPELINE_VERSION) {
        this.log(assetId, 'Asset already fully processed with current version');
        onProgress?.({ fileName, status: 'Done', progress: 100 });
        return this._buildImportedAsset(asset, file);
      }
      
      this.log(assetId, `Processing asset (Status: ${asset.importStatus}, Version: ${asset.pipelineVersion})`);
      
      // If version changed, reset pipeline state to re-run all steps
      if (asset.pipelineVersion !== CURRENT_PIPELINE_VERSION) {
        this.log(assetId, `Pipeline version changed (${asset.pipelineVersion} -> ${CURRENT_PIPELINE_VERSION}), resetting state.`);
        asset.pipelineState = {
          identity: 'pending',
          normalized: 'pending',
          hashed: 'pending',
          grouped: 'pending',
          seeded: 'pending',
          validated: 'pending',
          deduped: 'pending',
          entityLinked: 'pending'
        };
        asset.pipelineVersion = CURRENT_PIPELINE_VERSION;
      }
      
      // Reset status to processing if we are continuing
      asset.importStatus = 'processing';
    }

    try {
      // STEP 1: Identity (0A)
      if (asset.pipelineState.identity !== 'done') {
        this.log(assetId, 'Step 1: Identity');
        asset.pipelineState.identity = 'done';
      }

      // Extract Metadata (Prep for Normalization)
      onProgress?.({ fileName, status: 'Parsing Metadata', progress: 10 });
      const metadata = await extractMetadata(file);
      asset.exif = {
        iso: metadata.iso,
        shutter: metadata.shutterSpeed,
        aperture: metadata.aperture,
        camera: metadata.camera,
        lens: metadata.lens,
        orientation: metadata.orientation,
        captureTime: metadata.captureTime,
        originalCaptureTime: metadata.originalCaptureTime
      };

      // 7G.2.11: Automation Hook - Auto-apply copyright on import
      const { asset: updatedAsset, metadata: updatedMetadata } = settingsManager.applyAutoCopyright(asset, metadata);
      asset = updatedAsset;
      asset.exif = {
        iso: updatedMetadata.iso,
        shutter: updatedMetadata.shutterSpeed,
        aperture: updatedMetadata.aperture,
        camera: updatedMetadata.camera,
        lens: updatedMetadata.lens,
        orientation: updatedMetadata.orientation,
        captureTime: updatedMetadata.captureTime,
        originalCaptureTime: updatedMetadata.originalCaptureTime,
        Artist: updatedMetadata.exif?.Artist,
        Copyright: updatedMetadata.exif?.Copyright
      };

      // STEP 2: Normalization (0C)
      let previewBlob: Blob;
      if (asset.pipelineState.normalized !== 'done') {
        this.log(assetId, 'Step 2: Normalization');
        onProgress?.({ fileName, status: 'Extracting Preview', progress: 20 });
        let decodedBlob = await decodeFile(file);
        decodedBlob = await orientationFixer.fixOrientation(decodedBlob, metadata.orientation);

        const displayProfile = await colorManagement.getDisplayProfile();
        const cameraProfile = await colorManagement.getCameraProfile(metadata.camera);
        await colorManagement.applyColorTransform(await decodedBlob.arrayBuffer(), cameraProfile, displayProfile);

        previewBlob = await generatePreview(decodedBlob);

        onProgress?.({ fileName, status: 'Normalizing', progress: 50 });
        const normalized = await normalizeImage(previewBlob);
        if (!normalized || !normalized.data) throw new Error('Normalization failed');

        // Convert grayscale to RGBA for computeMultiHash
        const rgbaData = new Uint8ClampedArray(normalized.width * normalized.height * 4);
        for (let i = 0; i < normalized.data.length; i++) {
          const val = normalized.data[i];
          rgbaData[i * 4] = val;
          rgbaData[i * 4 + 1] = val;
          rgbaData[i * 4 + 2] = val;
          rgbaData[i * 4 + 3] = 255;
        }

        // Compute hashes
        asset.hashes = await computeMultiHash({
          data: rgbaData,
          width: normalized.width,
          height: normalized.height
        });
        asset.visualHash = asset.hashes.phash; // Keep for compatibility
        asset.pipelineState.hashed = 'done';

        const normalizedBuffer = new Float32Array(normalized.data.length);
        for (let i = 0; i < normalized.data.length; i++) {
          normalizedBuffer[i] = normalized.data[i] / 255.0;
        }
        asset.normalizedBuffer = normalizedBuffer;

        // Store original/preview
        await storeAsset(assetId, {
          originalFile: file,
          preview: previewBlob,
          metadata,
          hash: assetId
        });

        asset.pipelineState.normalized = 'done';
      }

      // STEP 3: Grouping (0B)
      if (asset.pipelineState.grouped !== 'done') {
        this.log(assetId, 'Step 3: Grouping');
        onProgress?.({ fileName, status: 'Grouping', progress: 70 });
        
        let groupId = assetId;
        const allAssets = store.getAll();
        for (const other of allAssets) {
          if (other.assetId !== assetId && other.hashes && compareImages(asset, other).isDuplicate) {
            groupId = other.groupId || other.assetId;
            break;
          }
        }
        asset.groupId = groupId;
        asset.pipelineState.grouped = 'done';
      }

      // STEP 4: Seed Assignment (0D)
      if (asset.pipelineState.seeded !== 'done') {
        this.log(assetId, 'Step 4: Seed Assignment');
        asset.seed = asset.groupId || asset.assetId;
        asset.pipelineState.seeded = 'done';
      }

      // STEP 5: Import Validation (0E)
      if (asset.pipelineState.validated !== 'done') {
        this.log(assetId, 'Step 5: Import Validation');
        onProgress?.({ fileName, status: 'Finalizing', progress: 90 });
        
        // Deterministic AI extraction (Stage 5)
        const faces = await detectFaces(file);
        if (!asset.ai) {
          asset.ai = { faces: [], sceneType: 'unknown', tags: [] };
        }
        asset.ai.faces = faces;

        asset.importStatus = 'valid';
        asset.pipelineState.validated = 'done';

        if (isNew) {
          assetStore.add(asset);
        }
        indexer.index(asset);
      }

      // STEP 6: Deduplication (0G)
      if (asset.pipelineState.deduped !== 'done') {
        this.log(assetId, 'Step 6: Deduplication');
        await dedupEngine.runDeduplication(asset, store);
        asset.pipelineState.deduped = 'done';
      }

      const importedAsset = await this._buildImportedAsset(asset, file, previewBlob);

      // STEP 7: Entity Linking (0H)
      if (asset.pipelineState.entityLinked !== 'done') {
        this.log(assetId, 'Step 7: Entity Linking');
        if (!options.skipAI) {
          await triggerAI(importedAsset);
        }
        asset.pipelineState.entityLinked = 'done';
      }

      this.log(assetId, 'Pipeline complete');
      onProgress?.({ fileName, status: 'Done', progress: 100 });
      
      if (!options.store) {
        indexer.index(asset);
      }
      
      if (!options.skipPersistence) {
        await systemDB.saveAsset(asset);
      }
      
      // Emit ASSET_UPDATED event so UI components can re-render
      if (!isNew) {
        assetStore.update(assetId, asset);
      }
      
      return importedAsset;

    } catch (error) {
      this.fail(asset, this._getCurrentStep(asset.pipelineState), error);
      throw error;
    }
  }

  private _getCurrentStep(state: PipelineState): keyof PipelineState {
    if (state.identity !== 'done') return 'identity';
    if (state.normalized !== 'done') return 'normalized';
    if (state.hashed !== 'done') return 'hashed';
    if (state.grouped !== 'done') return 'grouped';
    if (state.seeded !== 'done') return 'seeded';
    if (state.validated !== 'done') return 'validated';
    if (state.deduped !== 'done') return 'deduped';
    return 'entityLinked';
  }

  private async _buildImportedAsset(asset: Asset, file: File, previewBlob?: Blob): Promise<ImportedAsset> {
    if (!previewBlob) {
      const cached = await previewCache.get(asset.assetId);
      if (cached && cached.mediumPreview) {
        previewBlob = cached.mediumPreview;
      } else {
        // Fallback: generate it again
        let decodedBlob = await decodeFile(file);
        decodedBlob = await orientationFixer.fixOrientation(decodedBlob, asset.exif.orientation || 1);
        previewBlob = await generatePreview(decodedBlob);
      }
    }

    const url = URL.createObjectURL(previewBlob);
    return {
      ...asset,
      file,
      metadata: {
        iso: asset.exif.iso,
        shutterSpeed: asset.exif.shutter,
        aperture: asset.exif.aperture,
        camera: asset.exif.camera,
        lens: asset.exif.lens,
        orientation: asset.exif.orientation || 1,
        captureTime: asset.exif.captureTime,
        originalCaptureTime: asset.exif.originalCaptureTime
      } as any,
      thumbnailUrl: url,
      previewUrl: url,
      previewBlob: previewBlob,
    };
  }
}

export const orchestrator = new PipelineOrchestrator();
