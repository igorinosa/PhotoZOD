import { Asset } from '../dam/types';

export function groupBursts(assets: Asset[]): Asset[][] {
  if (assets.length === 0) return [];

  // Sort by timestamp
  const sorted = [...assets].sort((a, b) => a.createdAt - b.createdAt);

  const bursts: Asset[][] = [];
  let currentBurst: Asset[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = sorted[i - 1];

    // Group by timestamp delta < 300ms
    if (current.createdAt - prev.createdAt < 300) {
      currentBurst.push(current);
    } else {
      bursts.push(currentBurst);
      currentBurst = [current];
    }
  }
  bursts.push(currentBurst);

  return bursts;
}

export function pickBest(burst: Asset[]): Asset | undefined {
  if (burst.length === 0) return undefined;
  
  // Sort by AI score descending
  return [...burst].sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))[0];
}
