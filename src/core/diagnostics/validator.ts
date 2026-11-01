import { Asset } from '../dam/types';
import { assetStore } from '../dam/assetStore';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  assetId: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
  fixable: boolean;
}

export interface ValidationResult {
  assetId: string;
  isValid: boolean;
  issues: ValidationIssue[];
}

export class AssetValidator {
  public validate(assetId: string): ValidationResult {
    const asset = assetStore.get(assetId);
    const issues: ValidationIssue[] = [];

    if (!asset) {
      return {
        assetId,
        isValid: false,
        issues: [{
          assetId,
          code: 'MISSING_ASSET',
          message: `Asset ${assetId} not found in store`,
          severity: 'error',
          fixable: false
        }]
      };
    }

    // 1. assetId exists and is valid (Stage 0A)
    if (!asset.assetId || asset.assetId.length < 32) {
      issues.push({
        assetId,
        code: 'INVALID_ID',
        message: 'Asset ID is missing or too short (invalid fingerprint)',
        severity: 'error',
        fixable: false
      });
    }

    // 2. perceptual hash exists (Stage 0B)
    if (!asset.visualHash) {
      issues.push({
        assetId,
        code: 'MISSING_HASH',
        message: 'Perceptual hash is missing',
        severity: 'error',
        fixable: true
      });
    }

    // 3. seed exists (Stage 0D)
    if (!asset.seed) {
      issues.push({
        assetId,
        code: 'MISSING_SEED',
        message: 'Deterministic seed is missing',
        severity: 'warning',
        fixable: true
      });
    }

    // 4. duplicate group integrity (Stage 0G)
    if (asset.groupId) {
      const groupLeader = assetStore.get(asset.groupId);
      if (!groupLeader) {
        issues.push({
          assetId,
          code: 'BROKEN_GROUP',
          message: `Duplicate group leader ${asset.groupId} not found`,
          severity: 'error',
          fixable: true
        });
      }
    }

    // 5. entity links valid (Stage 0H)
    if (asset.entityIds && asset.entityIds.length > 0) {
      // In a real system, we'd check if these entityIds exist in entityStore
      // For now, we just check if the array exists
    }

    // 6. pipeline state complete (Stage 0I)
    const incompleteStates = Object.entries(asset.pipelineState)
      .filter(([_, status]) => status !== 'done')
      .map(([step]) => step);
    
    if (incompleteStates.length > 0) {
      issues.push({
        assetId,
        code: 'INCOMPLETE_PIPELINE',
        message: `Pipeline steps incomplete: ${incompleteStates.join(', ')}`,
        severity: 'warning',
        fixable: true
      });
    }

    // 7. references not broken (Stage 0J)
    if (!asset.path) {
      issues.push({
        assetId,
        code: 'MISSING_PATH',
        message: 'Primary file path is missing',
        severity: 'error',
        fixable: false
      });
    }

    return {
      assetId,
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }
}

export const assetValidator = new AssetValidator();
