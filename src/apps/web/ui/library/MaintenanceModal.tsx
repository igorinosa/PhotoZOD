import React, { useState, useEffect } from 'react';
import { reprocessEngine, ReprocessProgress } from '../../../../core/reprocess/reprocessEngine';
import { assetEventBus } from '../../../../core/events/assetEvents';
import { CURRENT_PIPELINE_VERSION } from '../../../../core/runtime/orchestrator';
import { assetStore } from '../../../../core/dam/assetStore';
import { healthMonitor, HealthMetrics } from '../../../../core/diagnostics/healthMonitor';
import { anomalyDetector, Anomaly } from '../../../../core/diagnostics/anomalyDetector';
import { diagnosticsEngine, DiagnosticsReport } from '../../../../core/diagnostics/diagnosticsEngine';
import { runCopyrightTests } from '../../../../core/metadata/copyrightTest';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose }) => {
  const [progress, setProgress] = useState<ReprocessProgress | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [validationResult, setValidationResult] = useState<{ errors: string[], fixed: number } | null>(null);
  const [outdatedCount, setOutdatedCount] = useState(0);
  const [metrics, setMetrics] = useState<HealthMetrics>(healthMonitor.getMetrics());
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [diagnosticsReport, setDiagnosticsReport] = useState<DiagnosticsReport | null>(null);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const outdated = assetStore.getAll().filter(a => a.pipelineVersion !== CURRENT_PIPELINE_VERSION).length;
      setOutdatedCount(outdated);
      setMetrics(healthMonitor.getMetrics());
      setAnomalies(anomalyDetector.detectAnomalies());
    }
  }, [isOpen]);

  useEffect(() => {
    // Periodic health check (0L.11)
    const interval = setInterval(() => {
      if (isOpen) {
        setMetrics(healthMonitor.getMetrics());
        setAnomalies(anomalyDetector.detectAnomalies());
      }
    }, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = assetEventBus.subscribe('REPROCESS_PROGRESS', (_, payload) => {
      setProgress(payload);
      if (payload.processed + payload.failed === payload.total && payload.total > 0) {
        setIsReprocessing(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleReprocessAll = async (force = false) => {
    setIsReprocessing(true);
    setValidationResult(null);
    await reprocessEngine.reprocessAll({ force });
  };

  const handleValidate = async () => {
    const report = await diagnosticsEngine.runFullDiagnostics();
    setDiagnosticsReport(report);
    setValidationResult({
      errors: report.allIssues.filter(i => i.severity === 'error').map(i => i.message),
      fixed: 0
    });
  };

  const handleAutoFix = async () => {
    const result = await diagnosticsEngine.runAutoFix();
    setValidationResult({
      errors: [],
      fixed: result.fixed
    });
    // Refresh
    const report = await diagnosticsEngine.runFullDiagnostics();
    setDiagnosticsReport(report);
  };

  const handleRunCopyrightTests = async () => {
    setIsTesting(true);
    const result = await runCopyrightTests();
    setTestResult(result);
    setIsTesting(false);
  };

  if (!isOpen) return null;

  const systemStatus = anomalies.some(a => a.severity === 'critical') ? 'Attention Needed' : 
                      anomalies.length > 0 ? 'Minor Issues Detected' : 'System Healthy';
  const statusColor = anomalies.some(a => a.severity === 'critical') ? 'text-red-500' : 
                     anomalies.length > 0 ? 'text-amber-500' : 'text-green-500';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">System Diagnostics</h2>
            <div className={`text-xs font-medium mt-1 ${statusColor}`}>
              {systemStatus}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10 max-h-[85vh] overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Live Health Metrics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase font-bold truncate">Success Rate</div>
                  <div className="text-base sm:text-lg font-mono text-white truncate">{metrics.pipelineSuccessRate.toFixed(1)}%</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase font-bold truncate">Avg Latency</div>
                  <div className="text-base sm:text-lg font-mono text-white truncate">{metrics.avgProcessingTimeMs.toFixed(0)}ms</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase font-bold truncate">Processed</div>
                  <div className="text-base sm:text-lg font-mono text-white truncate">{metrics.totalProcessed}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase font-bold truncate">Failures</div>
                  <div className="text-base sm:text-lg font-mono text-red-400 truncate">{metrics.totalFailed}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Detected Anomalies</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {anomalies.length === 0 ? (
                  <div className="text-xs text-white/30 italic">No anomalies detected.</div>
                ) : (
                  anomalies.map((a, i) => (
                    <div key={i} className={`p-3 rounded-xl border text-xs ${a.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                      <div className="font-bold mb-1">{a.type}</div>
                      <div className="opacity-80 break-words">{a.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Pipeline Version</span>
                <span className="text-white font-mono">{CURRENT_PIPELINE_VERSION}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Outdated Assets</span>
                <span className="text-white font-mono">{outdatedCount}</span>
              </div>
            </div>

            {isReprocessing && progress && (
              <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-white/60">Reprocessing...</span>
                  <span className="text-white">{Math.round((progress.processed + progress.failed) / progress.total * 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${((progress.processed + progress.failed) / progress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>P: {progress.processed}</span>
                  <span>F: {progress.failed}</span>
                  <span>T: {progress.total}</span>
                </div>
              </div>
            )}

            {validationResult && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                <div className="text-sm font-medium text-blue-400">Scan Complete</div>
                <div className="text-xs text-blue-400/70">
                  Fixed {validationResult.fixed} issues. {validationResult.errors.length} errors remaining.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleReprocessAll(false)}
                disabled={isReprocessing || outdatedCount === 0}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                Reprocess Outdated
              </button>

              <button
                onClick={handleValidate}
                disabled={isReprocessing}
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                Run Full Scan
              </button>

              <button
                onClick={handleAutoFix}
                disabled={isReprocessing}
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                Run Auto-Repair
              </button>

              <button
                onClick={handleRunCopyrightTests}
                disabled={isTesting}
                className={`w-full py-3 px-4 border rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  testResult === true ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                  testResult === false ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                {isTesting ? 'Running Tests...' : testResult === true ? 'Copyright Tests Passed' : testResult === false ? 'Copyright Tests Failed' : 'Run Copyright Tests'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/5 text-[10px] text-white/30 text-center border-t border-white/10">
          Diagnostics system provides real-time visibility into system health and data integrity.
        </div>
      </div>
    </div>
  );
};
