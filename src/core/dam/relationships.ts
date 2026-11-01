import { Asset } from './types';

export function groupBurst(assets: Asset[], timeThresholdMs = 1000): Record<string, Asset[]> {
  // group by timestamp proximity
  const sorted = [...assets].sort((a, b) => a.createdAt - b.createdAt);
  const bursts: Record<string, Asset[]> = {};
  
  let currentBurstId = '';
  let lastTime = 0;

  for (const asset of sorted) {
    if (asset.createdAt - lastTime <= timeThresholdMs && currentBurstId) {
      bursts[currentBurstId].push(asset);
      asset.burstId = currentBurstId;
    } else {
      currentBurstId = `burst_${asset.assetId}`;
      bursts[currentBurstId] = [asset];
      asset.burstId = currentBurstId;
    }
    lastTime = asset.createdAt;
  }

  // Filter out single-asset bursts
  for (const id in bursts) {
    if (bursts[id].length <= 1) {
      bursts[id][0].burstId = undefined;
      delete bursts[id];
    }
  }

  return bursts;
}

export function stackVersions(assets: Asset[]): Record<string, Asset[]> {
  // RAW + JPG grouping via hash or filename
  const stacks: Record<string, Asset[]> = {};

  for (const asset of assets) {
    // Basic stacking by filename without extension
    const baseName = asset.fileName.substring(0, asset.fileName.lastIndexOf('.')) || asset.fileName;
    const stackId = `stack_${baseName}`;
    
    if (!stacks[stackId]) {
      stacks[stackId] = [];
    }
    stacks[stackId].push(asset);
    asset.stackId = stackId;
  }

  // Filter out single-asset stacks
  for (const id in stacks) {
    if (stacks[id].length <= 1) {
      stacks[id][0].stackId = undefined;
      delete stacks[id];
    }
  }

  return stacks;
}
