import { DiagnosticsReport, DiagnosticsSummary } from './diagnosticsEngine';
import { Anomaly } from './anomalyDetector';
import { HealthMetrics } from './healthMonitor';

export class DiagnosticsReporter {
  public generateHumanReadableReport(report: DiagnosticsReport, anomalies: Anomaly[], metrics: HealthMetrics): string {
    const lines: string[] = [];
    lines.push('--- DIAGNOSTICS REPORT ---');
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push(`Assets Checked: ${report.summary.totalAssets}`);
    lines.push(`✔ Valid: ${report.summary.valid}`);
    lines.push(`⚠ Warnings: ${report.summary.warnings}`);
    lines.push(`❌ Errors: ${report.summary.errors}`);
    lines.push(`🛠 Fixed: ${report.summary.fixedCount}`);
    lines.push('');

    if (Object.keys(report.summary.breakdown).length > 0) {
      lines.push('--- BREAKDOWN ---');
      for (const [code, count] of Object.entries(report.summary.breakdown)) {
        lines.push(`- ${code}: ${count}`);
      }
      lines.push('');
    }

    if (anomalies.length > 0) {
      lines.push('--- ANOMALIES ---');
      for (const anomaly of anomalies) {
        lines.push(`[${anomaly.severity.toUpperCase()}] ${anomaly.type}: ${anomaly.description}`);
      }
      lines.push('');
    }

    lines.push('--- HEALTH METRICS ---');
    lines.push(`Pipeline Success Rate: ${metrics.pipelineSuccessRate.toFixed(1)}%`);
    lines.push(`Avg Processing Time: ${metrics.avgProcessingTimeMs.toFixed(0)}ms`);
    lines.push(`Total Processed: ${metrics.totalProcessed}`);
    lines.push(`Total Failed: ${metrics.totalFailed}`);

    return lines.join('\n');
  }

  public logToSystem(reportStr: string) {
    console.log('[DiagnosticsReporter]', reportStr);
    // In a real system, we'd write this to /system/logs/diagnostics.log
  }
}

export const diagnosticsReporter = new DiagnosticsReporter();
