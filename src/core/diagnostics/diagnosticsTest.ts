import { assetStore } from '../dam/assetStore';
import { diagnosticsEngine } from './diagnosticsEngine';
import { Asset } from '../dam/types';
import { diagnosticsReporter } from './reporter';
import { anomalyDetector } from './anomalyDetector';
import { healthMonitor } from './healthMonitor';

export async function runDiagnosticsValidation() {
  console.log('[DiagnosticsTest] Starting validation...');

  // 1. Create a corrupt asset
  const corruptAsset: Asset = {
    assetId: 'corrupt-asset-id-32-chars-long-xxxx',
    path: 'test/corrupt.jpg',
    duplicatePaths: [],
    fileName: 'corrupt.jpg',
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
    exif: {},
    entityIds: [],
    culling: 'maybe',
    pickStatus: 'unflagged',
    importStatus: 'valid',
    pipelineVersion: '1.0.0',
    rating: null,
    colorTag: null,
    pipelineState: {
      identity: 'done',
      normalized: 'pending', // Incomplete
      hashed: 'failed',     // Failed
      grouped: 'done',
      seeded: 'done',
      validated: 'done',
      deduped: 'done',
      entityLinked: 'done'
    },
    // Missing visualHash
    // Missing seed
  };

  assetStore.add(corruptAsset);
  console.log('[DiagnosticsTest] Corrupt asset added.');

  // 2. Run diagnostics
  console.log('[DiagnosticsTest] Running full diagnostics...');
  const report = await diagnosticsEngine.runFullDiagnostics();
  const anomalies = anomalyDetector.detectAnomalies();
  const metrics = healthMonitor.getMetrics();

  const reportStr = diagnosticsReporter.generateHumanReadableReport(report, anomalies, metrics);
  console.log(reportStr);

  // 3. Verify detection
  const hasHashIssue = report.allIssues.some(i => i.assetId === corruptAsset.assetId && i.code === 'MISSING_HASH');
  const hasPipelineIssue = report.allIssues.some(i => i.assetId === corruptAsset.assetId && i.code === 'INCOMPLETE_PIPELINE');

  if (hasHashIssue && hasPipelineIssue) {
    console.log('[DiagnosticsTest] SUCCESS: Issues correctly detected.');
  } else {
    console.log('[DiagnosticsTest] FAILURE: Issues NOT detected.');
  }

  // 4. Test Auto-Fix
  console.log('[DiagnosticsTest] Testing Auto-Fix...');
  const fixResult = await diagnosticsEngine.runAutoFix();
  console.log(`[DiagnosticsTest] Fixed: ${fixResult.fixed}, Failed: ${fixResult.failed}`);

  // Note: MISSING_HASH triggers reprocessAsset, which might fail in test env if file missing
  // but MISSING_SEED should be fixed instantly.
  
  const updated = assetStore.get(corruptAsset.assetId);
  if (updated && updated.seed) {
    console.log('[DiagnosticsTest] SUCCESS: Seed auto-fixed.');
  }

  console.log('[DiagnosticsTest] Validation complete.');
}
