import { RuleNode } from './types';
import { Asset } from '../dam/types';
import { get } from '../utils/get';
import { getIndexManager } from './indexManager';
import { FIELDS } from './fieldRegistry';

export function evaluateNode(node: RuleNode, asset: Asset, getCached?: (path: string) => any): boolean {
  if (node.type === "condition") {
    return evaluateCondition(node, asset, getCached);
  }

  if (node.operator === "AND") {
    return node.children.every(child => evaluateNode(child, asset, getCached));
  }

  if (node.operator === "OR") {
    return node.children.some(child => evaluateNode(child, asset, getCached));
  }

  return false;
}

export function evaluateCondition(cond: { field: string, operator: string, value: any }, asset: Asset, getCached?: (path: string) => any): boolean {
  const fieldDef = FIELDS.find(f => f.key === cond.field);
  
  if (fieldDef && fieldDef.type === 'derived') {
    if (!fieldDef.evaluator) {
      throw new Error("Derived field missing evaluator: " + fieldDef.key);
    }
    const isMatch = fieldDef.evaluator(asset);
    if (cond.operator === '=') return cond.value ? isMatch : !isMatch;
    if (cond.operator === '!=') return cond.value ? !isMatch : isMatch;
    return isMatch;
  }

  const value = getCached ? getCached(cond.field) : get(asset, cond.field);

  switch (cond.operator) {
    case "=":
      if (cond.value === null) {
        return value === null || value === undefined || value === 'none' || (Array.isArray(value) && value.length === 0);
      }
      return value === cond.value;

    case "!=":
      if (cond.value === null) {
        return value !== null && value !== undefined && value !== 'none' && !(Array.isArray(value) && value.length === 0);
      }
      return value !== cond.value;

    case ">":
      return value > cond.value;

    case "<":
      return value < cond.value;

    case "contains":
      if (Array.isArray(value)) {
        return value.includes(cond.value);
      }
      return String(value).includes(cond.value);

    case "length>":
      return (value?.length || 0) > cond.value;

    case "length<":
      return (value?.length || 0) < cond.value;

    case "length=":
      return (value?.length || 0) === cond.value;

    case "exists":
      return value !== undefined && value !== null && value !== 'none' && !(Array.isArray(value) && value.length === 0);

    case "not_exists":
      return value === undefined || value === null || value === 'none' || (Array.isArray(value) && value.length === 0);

    default:
      return false;
  }
}

export function countSatisfiedConditions(node: RuleNode, asset: Asset, getCached?: (path: string) => any): number {
  if (node.type === "condition") {
    return evaluateCondition(node, asset, getCached) ? 1 : 0;
  }

  if (node.operator === "AND" || node.operator === "OR") {
    return node.children.reduce((sum, child) => sum + countSatisfiedConditions(child, asset, getCached), 0);
  }

  return 0;
}

export function compileEvaluator(rule: RuleNode) {
  return (asset: Asset) => {
    const cache: Record<string, any> = {};

    function getCached(path: string) {
      if (!(path in cache)) {
        cache[path] = get(asset, path);
      }
      return cache[path];
    }

    return evaluateNode(rule, asset, getCached);
  };
}

function isDerivedCondition(cond: { field: string }): boolean {
  const fieldDef = FIELDS.find(f => f.key === cond.field);
  return fieldDef?.type === 'derived' || false;
}

function splitRule(rule: RuleNode): { indexed: RuleNode | null, derived: RuleNode | null } {
  if (rule.type === 'condition') {
    if (isDerivedCondition(rule)) {
      return { indexed: null, derived: rule };
    }
    return { indexed: rule, derived: null };
  }

  if (rule.operator === 'AND') {
    const indexedChildren: RuleNode[] = [];
    const derivedChildren: RuleNode[] = [];
    
    for (const child of rule.children) {
      const split = splitRule(child);
      if (split.indexed) indexedChildren.push(split.indexed);
      if (split.derived) derivedChildren.push(split.derived);
    }

    const indexed: RuleNode | null = indexedChildren.length === 0 ? null : 
                   (indexedChildren.length === 1 ? indexedChildren[0] : { type: 'group', operator: 'AND', children: indexedChildren });
    const derived: RuleNode | null = derivedChildren.length === 0 ? null : 
                   (derivedChildren.length === 1 ? derivedChildren[0] : { type: 'group', operator: 'AND', children: derivedChildren });
                   
    return { indexed, derived };
  }

  if (rule.operator === 'OR') {
    let hasDerived = false;
    for (const child of rule.children) {
      const split = splitRule(child);
      if (split.derived) hasDerived = true;
    }
    
    if (hasDerived) {
      return { indexed: null, derived: rule };
    }
    return { indexed: rule, derived: null };
  }

  return { indexed: rule, derived: null };
}

export function runQuery(rule: RuleNode, assets: Asset[]): Asset[] {
  const indexManager = getIndexManager();
  
  if (!indexManager) {
    const evaluator = compileEvaluator(rule);
    return assets.filter(evaluator);
  }

  const { indexed, derived } = splitRule(rule);
  
  let candidates = assets;
  let ruleToEvaluate: RuleNode | null = derived;
  let usedIndex = false;

  if (indexed) {
    const allAssetIds = new Set(assets.map(a => a.assetId));
    const res = indexManager.query(indexed, allAssetIds);
    
    candidates = assets.filter(a => res.ids.has(a.assetId));
    usedIndex = true;
    
    if (!res.fullyResolved) {
      ruleToEvaluate = rule; // Need to re-evaluate everything if index wasn't fully resolved
    }
  } else {
    ruleToEvaluate = rule; // No indexed conditions, evaluate full rule
  }
  
  console.log("[Search Debug]", {
    hasIndexed: !!indexed,
    hasDerived: !!derived,
    usedIndex: usedIndex,
    candidateCount: usedIndex ? candidates.length : "FULL_SCAN"
  });

  if (indexed && !usedIndex) {
    console.error("SEARCH REGRESSION: Indexed rule exists but index not used");
  }

  if (!ruleToEvaluate) {
    return candidates;
  }
  
  const evaluator = compileEvaluator(ruleToEvaluate);
  const result: Asset[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const asset = candidates[i];
    if (evaluator(asset)) {
      result.push(asset);
    }
  }

  return result;
}
