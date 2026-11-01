import { Operation } from './compiler';
import { assetStore } from '../dam/assetStore';

// Simple string hash function
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function applySeed(op: Operation, assetId: string, globalSeed?: string): Operation {
  if (!op.seed) {
    // 0D.3: baseSeed = groupId (fallback to assetId)
    const asset = assetStore.get(assetId);
    const baseSeed = asset?.groupId || assetId;
    
    // 0D.5: operationSeed = hash(baseSeed + operationId + type)
    op.seed = globalSeed || hashString(`${baseSeed}_${op.id}_${op.type}`);
  }
  return op;
}
