import { getAllAssets } from '../registry/assetRegistry';
import { compileEvaluator } from './evaluator';
import { RuleNode } from './types';
import { Asset } from '../dam/types';

export function computeCollection(rule: RuleNode): Asset[] {
  const assets = getAllAssets();
  const evaluator = compileEvaluator(rule);
  
  const result: Asset[] = [];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (evaluator(asset)) {
      result.push(asset);
    }
  }
  
  return result;
}
