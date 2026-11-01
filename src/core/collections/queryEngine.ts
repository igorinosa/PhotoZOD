import { Asset } from '../dam/types';
import { CollectionRule } from './types';
import { runQuery } from './evaluator';

export function runCollection(rule: CollectionRule, assets: Asset[]): Asset[] {
  return runQuery(rule, assets);
}
