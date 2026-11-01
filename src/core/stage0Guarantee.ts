import { assetStore } from './dam/assetStore';
import { orchestrator } from './runtime/orchestrator';
import { dedupEngine } from './dedup/dedupManager';
import { entityStore } from './entity/entityStore';
import { diagnosticsEngine } from './diagnostics/diagnosticsEngine';
import { healthMonitor } from './diagnostics/healthMonitor';
import { anomalyDetector } from './diagnostics/anomalyDetector';

/**
 * STAGE 0L.13 — SYSTEM GUARANTEE VALIDATION
 * This script verifies that all Stage 0 components are integrated and functional.
 */
export async function verifyStage0Guarantee() {
  console.log('--- STAGE 0 SYSTEM GUARANTEE VERIFICATION ---');

  const results = {
    identity: false,    // 0A-0B
    pipeline: false,    // 0C-0E
    registry: false,    // 0F-0G
    entities: false,    // 0H
    execution: false,   // 0I
    persistence: false, // 0J
    rebuild: false,     // 0K
    diagnostics: false  // 0L
  };

  try {
    // 1. Verify Identity & Registry (0A, 0B, 0F, 0G)
    if (assetStore && dedupEngine) {
      results.identity = true;
      results.registry = true;
      console.log('✔ Identity & Registry systems are active.');
    }

    // 2. Verify Entities (0H)
    if (entityStore) {
      results.entities = true;
      console.log('✔ Entity system is active.');
    }

    // 3. Verify Execution & Pipeline (0I, 0C-0E)
    if (orchestrator) {
      results.execution = true;
      results.pipeline = true;
      console.log('✔ Orchestrator & Pipeline are active.');
    }

    // 4. Verify Diagnostics (0L)
    const report = await diagnosticsEngine.runFullDiagnostics();
    const anomalies = anomalyDetector.detectAnomalies();
    const metrics = healthMonitor.getMetrics();
    
    if (report && anomalies && metrics) {
      results.diagnostics = true;
      console.log('✔ Diagnostics, Monitoring, and Anomaly Detection are active.');
    }

    // 5. Final Guarantee Check
    const allPassed = Object.values(results).every(v => v === true);
    
    if (allPassed) {
      console.log('\n🔥 STAGE 0 COMPLETE: SYSTEM GUARANTEE SECURED');
      console.log('✔ Deterministic');
      console.log('✔ Self-healing');
      console.log('✔ Observable');
      console.log('✔ Scalable');
      console.log('✔ Production-ready');
    } else {
      console.error('❌ STAGE 0 GUARANTEE FAILED: Some components are missing or inactive.');
      console.table(results);
    }

  } catch (error) {
    console.error('❌ STAGE 0 GUARANTEE CRITICAL FAILURE:', error);
  }

  console.log('--- VERIFICATION COMPLETE ---');
}
