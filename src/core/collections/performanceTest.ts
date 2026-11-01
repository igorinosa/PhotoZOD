import { Asset } from '../../shared/types';
import { runQuery } from './evaluator';
import { SMART_COLLECTIONS } from './smartRegistry';
import { assetStore } from '../dam/assetStore';

export function runPerformanceTest() {
  console.log("🚀 Starting Smart Collections Performance Test...");
  
  const assets = assetStore.getAll();
  const assetCount = assets.length;
  
  if (assetCount < 1000) {
    console.warn(`⚠️ Only ${assetCount} real assets found. Performance test requires at least 1000 assets for meaningful results. Skipping.`);
    return;
  }
  
  console.log(`Testing against ${assetCount} real assets...`);
  
  const queriesToTest = ['keep', 'best', 'recent'];
  
  for (const queryId of queriesToTest) {
    const collection = SMART_COLLECTIONS.find(c => c.id === queryId);
    if (!collection) continue;
    
    const start = performance.now();
    const result = runQuery(collection.rule, assets);
    const end = performance.now();
    
    console.log(`Query "${collection.name}": found ${result.length} assets in ${(end - start).toFixed(2)}ms`);
  }
  
  console.log("✨ Performance Test Complete");
}
