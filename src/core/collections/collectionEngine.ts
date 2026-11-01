import { getIndexManager } from './indexManager';
import { RuleNode } from './types';
import { assetStore } from '../dam/assetStore';

/**
 * Evaluates a collection rule using the IndexManager for performance.
 * SSOT: AssetStore + IndexManager + RuleNode
 */
export function evaluateCollection(rule: RuleNode): Set<string> {
  const indexManager = getIndexManager();
  const allAssets = assetStore.getAll();
  const allAssetIds = new Set(allAssets.map(a => a.assetId));

  if (!indexManager) {
    // Fallback if index manager is not initialized (should not happen in production)
    console.warn('IndexManager not initialized, collection evaluation may be slow');
    return new Set();
  }

  const queryResult = indexManager.query(rule, allAssetIds);
  
  return queryResult.ids;
}
