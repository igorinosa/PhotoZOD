import { dedupEngine } from './dedupManager';
import { Asset } from '../dam/types';
import { assetStore } from '../dam/assetStore';

/**
 * Validation Test for Stage 0G Deduplication Engine
 */
export async function runDedupValidation() {
  console.log('--- STARTING DEDUPLICATION VALIDATION ---');

  // 1. Setup Mock Assets
  const assetA: Asset = {
    assetId: 'hash123',
    visualHash: 'abcdef1234567890',
    groupId: 'hash123',
    seed: 'hash123',
    normalizedBuffer: new Float32Array(0),
    path: 'folder1/image.jpg',
    duplicatePaths: [],
    fileName: 'image.jpg',
    format: 'jpeg',
    formatGroup: 'jpeg',
    size: 1024,
    fileSize: 1024,
    backupStatus: { local: true, external: false, cloud: false },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    importedAt: Date.now(),
    qualityScore: 0.5,
    ai: { faces: [], sceneType: 'unknown', tags: [] },
    duplicateGroupId: null,
    exif: { iso: 100, shutter: '1/100', aperture: 2.8, camera: 'Sony', lens: '35mm' },
    entityIds: [],
    culling: 'maybe',
    pickStatus: 'unflagged',
    importStatus: 'valid',
    pipelineState: {
      identity: 'done',
      normalized: 'done',
      hashed: 'done',
      grouped: 'done',
      seeded: 'done',
      validated: 'done',
      deduped: 'done',
      entityLinked: 'done'
    },
    pipelineVersion: '1.0.0',
    rating: null,
    colorTag: null
  };

  const assetB: Asset = {
    assetId: 'hash123', // Same ID = Exact Duplicate
    visualHash: 'abcdef1234567890',
    groupId: 'hash123',
    seed: 'hash123',
    normalizedBuffer: new Float32Array(0),
    path: 'folder2/image_copy.jpg',
    duplicatePaths: [],
    fileName: 'image_copy.jpg',
    format: 'jpeg',
    formatGroup: 'jpeg',
    size: 1024,
    fileSize: 1024,
    backupStatus: { local: true, external: false, cloud: false },
    createdAt: Date.now() + 1000,
    updatedAt: Date.now() + 1000,
    importedAt: Date.now(),
    qualityScore: 0.5,
    ai: { faces: [], sceneType: 'unknown', tags: [] },
    duplicateGroupId: null,
    exif: { iso: 100, shutter: '1/100', aperture: 2.8, camera: 'Sony', lens: '35mm' },
    entityIds: [],
    culling: 'maybe',
    pickStatus: 'unflagged',
    importStatus: 'valid',
    pipelineState: {
      identity: 'done',
      normalized: 'done',
      hashed: 'done',
      grouped: 'done',
      seeded: 'done',
      validated: 'done',
      deduped: 'done',
      entityLinked: 'done'
    },
    pipelineVersion: '1.0.0',
    rating: null,
    colorTag: null
  };

  const assetC: Asset = {
    assetId: 'hash456',
    visualHash: 'abcdef1234567891', // Visually similar to A (Hamming distance 1)
    groupId: 'hash456',
    seed: 'hash456',
    normalizedBuffer: new Float32Array(0),
    path: 'folder1/image_resized.jpg',
    duplicatePaths: [],
    fileName: 'image_resized.jpg',
    format: 'jpeg',
    formatGroup: 'jpeg',
    size: 512,
    fileSize: 512,
    backupStatus: { local: true, external: false, cloud: false },
    createdAt: Date.now() + 2000,
    updatedAt: Date.now() + 2000,
    importedAt: Date.now(),
    qualityScore: 0.5,
    ai: { faces: [], sceneType: 'unknown', tags: [] },
    duplicateGroupId: null,
    exif: { iso: 100, shutter: '1/100', aperture: 2.8, camera: 'Sony', lens: '35mm' },
    entityIds: [],
    culling: 'maybe',
    pickStatus: 'unflagged',
    importStatus: 'valid',
    pipelineState: {
      identity: 'done',
      normalized: 'done',
      hashed: 'done',
      grouped: 'done',
      seeded: 'done',
      validated: 'done',
      deduped: 'done',
      entityLinked: 'done'
    },
    pipelineVersion: '1.0.0',
    rating: null,
    colorTag: null
  };

  // 2. Test Exact Duplicate Merge
  console.log('Testing Exact Duplicate Merge...');
  assetStore.add(assetA);
  dedupEngine.setAutoMerge(true);
  const resultB = await dedupEngine.runDeduplication(assetB);
  
  if (resultB.assetId === assetA.assetId && assetA.duplicatePaths.includes(assetB.path)) {
    console.log('✅ Exact duplicate merged successfully.');
  } else {
    console.error('❌ Exact duplicate merge failed.');
  }

  // 3. Test Visual Duplicate Grouping
  console.log('Testing Visual Duplicate Grouping...');
  assetStore.add(assetC);
  await dedupEngine.runDeduplication(assetC);
  
  if (assetC.groupId === assetA.assetId) {
    console.log('✅ Visual duplicate grouped successfully.');
  } else {
    console.error('❌ Visual duplicate grouping failed. GroupId:', assetC.groupId);
  }

  console.log('--- DEDUPLICATION VALIDATION COMPLETE ---');
}
