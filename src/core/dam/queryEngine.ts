import { indexer } from './indexer';
import { assetStore } from './assetStore';
import { CullingStatus } from './types';

export function queryAssets({
  status,
  entityId,
  format,
  sharpness
}: {
  status?: CullingStatus;
  entityId?: string;
  format?: string;
  sharpness?: 'high' | 'medium' | 'low';
}): string[] {
  let result: Set<string> | null = null;

  if (status) {
    result = new Set(indexer.statusIndex[status]);
  }

  if (entityId) {
    const entitySet = indexer.entityIndex.get(entityId) || new Set();
    result = result ? intersect(result, entitySet) : new Set(entitySet);
  }

  if (format) {
    const formatSet = indexer.formatIndex[format] || new Set();
    result = result ? intersect(result, formatSet) : new Set(formatSet);
  }

  if (sharpness) {
    const sharpnessSet = indexer.sharpnessIndex[sharpness] || new Set();
    result = result ? intersect(result, sharpnessSet) : new Set(sharpnessSet);
  }

  if (result === null) {
    return assetStore.getAll().map(a => a.assetId);
  }

  return Array.from(result);
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const result = new Set<string>();
  // Iterate over the smaller set for performance
  if (a.size < b.size) {
    for (const val of a) {
      if (b.has(val)) result.add(val);
    }
  } else {
    for (const val of b) {
      if (a.has(val)) result.add(val);
    }
  }
  return result;
}
