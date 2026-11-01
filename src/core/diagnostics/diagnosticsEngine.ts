import { assetStore } from '../dam/assetStore';
import { assetValidator, ValidationResult, ValidationIssue } from './validator';
import { reprocessEngine } from '../reprocess/reprocessEngine';

export interface DiagnosticsSummary {
  totalAssets: number;
  valid: number;
  warnings: number;
  errors: number;
  breakdown: { [code: string]: number };
  fixedCount: number;
}

export interface DiagnosticsReport {
  summary: DiagnosticsSummary;
  allIssues: ValidationIssue[];
}

export class DiagnosticsEngine {
  public async runFullDiagnostics(): Promise<DiagnosticsReport> {
    const assets = assetStore.getAll();
    const summary: DiagnosticsSummary = {
      totalAssets: assets.length,
      valid: 0,
      warnings: 0,
      errors: 0,
      breakdown: {},
      fixedCount: 0
    };

    const allIssues: ValidationIssue[] = [];

    for (const asset of assets) {
      const result = assetValidator.validate(asset.assetId);
      
      if (result.isValid && result.issues.length === 0) {
        summary.valid++;
      } else {
        if (result.issues.some(i => i.severity === 'error')) {
          summary.errors++;
        } else if (result.issues.some(i => i.severity === 'warning')) {
          summary.warnings++;
        }

        for (const issue of result.issues) {
          summary.breakdown[issue.code] = (summary.breakdown[issue.code] || 0) + 1;
          allIssues.push(issue);
        }
      }
    }

    return { summary, allIssues };
  }

  public async runAutoFix(): Promise<{ fixed: number, failed: number }> {
    const report = await this.runFullDiagnostics();
    let fixed = 0;
    let failed = 0;

    const fixableIssues = report.allIssues.filter(i => i.fixable);

    for (const issue of fixableIssues) {
      try {
        const success = await this.applyFix(issue);
        if (success) fixed++;
        else failed++;
      } catch (err) {
        console.error(`[Diagnostics] Failed to fix ${issue.code} for ${issue.assetId}:`, err);
        failed++;
      }
    }

    return { fixed, failed };
  }

  private async applyFix(issue: ValidationIssue): Promise<boolean> {
    const asset = assetStore.get(issue.assetId);
    if (!asset) return false;

    switch (issue.code) {
      case 'MISSING_HASH':
      case 'INCOMPLETE_PIPELINE':
        // Outdated or incomplete pipeline -> trigger reprocess
        await reprocessEngine.reprocessAsset(issue.assetId);
        return true;

      case 'MISSING_SEED':
        // Regenerate seed (deterministic)
        asset.seed = asset.assetId; // Simple fix for now
        return true;

      case 'BROKEN_GROUP':
        // Point to self as leader
        asset.groupId = asset.assetId;
        return true;

      default:
        return false;
    }
  }
}

export const diagnosticsEngine = new DiagnosticsEngine();
