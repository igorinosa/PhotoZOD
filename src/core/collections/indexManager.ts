import { Asset } from '../dam/types';
import { RuleNode } from './types';
import { FIELDS } from './fieldRegistry';

type IndexValue = string | number | boolean | null;

class RangeIndex {
  private valueMap = new Map<number, Set<string>>();
  private sortedValues: number[] = [];

  add(value: number, assetId: string) {
    if (!this.valueMap.has(value)) {
      this.valueMap.set(value, new Set());
      // Binary search for insertion
      let low = 0, high = this.sortedValues.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (this.sortedValues[mid] < value) low = mid + 1;
        else high = mid;
      }
      this.sortedValues.splice(low, 0, value);
    }
    this.valueMap.get(value)!.add(assetId);
  }

  remove(value: number, assetId: string) {
    const set = this.valueMap.get(value);
    if (set) {
      set.delete(assetId);
      if (set.size === 0) {
        this.valueMap.delete(value);
        // Binary search for removal
        let low = 0, high = this.sortedValues.length;
        while (low < high) {
          const mid = (low + high) >>> 1;
          if (this.sortedValues[mid] < value) low = mid + 1;
          else high = mid;
        }
        if (this.sortedValues[low] === value) {
          this.sortedValues.splice(low, 1);
        }
      }
    }
  }

  getRange(op: string, target: number): Set<string> {
    const result = new Set<string>();
    
    if (op === '>' || op === '>=') {
      let low = 0, high = this.sortedValues.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (this.sortedValues[mid] < target) low = mid + 1;
        else high = mid;
      }
      for (let i = low; i < this.sortedValues.length; i++) {
        const val = this.sortedValues[i];
        if (op === '>' && val === target) continue;
        for (const id of this.valueMap.get(val)!) result.add(id);
      }
    } else if (op === '<' || op === '<=') {
      for (let i = 0; i < this.sortedValues.length; i++) {
        const val = this.sortedValues[i];
        if (op === '<' && val >= target) break;
        if (op === '<=' && val > target) break;
        for (const id of this.valueMap.get(val)!) result.add(id);
      }
    } else if (op === '=') {
      const set = this.valueMap.get(target);
      if (set) {
        for (const id of set) result.add(id);
      }
    } else if (op === '!=') {
      for (let i = 0; i < this.sortedValues.length; i++) {
        const val = this.sortedValues[i];
        if (val !== target) {
          for (const id of this.valueMap.get(val)!) result.add(id);
        }
      }
    }
    return result;
  }
}

export class IndexManager {
  private exactIndices: Map<string, Map<IndexValue, Set<string>>> = new Map();
  private rangeIndices: Map<string, RangeIndex> = new Map();

  private exactFields = ['culling', 'pickStatus', 'ai.sceneType', 'duplicateGroupId', 'ai.tags', 'colorTag', 'rating', 'ai.tags.length', 'isTrashed', 'formatGroup', 'fileName', 'entityIds'];
  private rangeFields = ['importedAt', 'qualityScore', 'ai.faces.length', 'ai.tags.length', 'rating', 'trashedAt'];

  constructor(assets: Asset[]) {
    // FORCE CONSISTENCY: Ensure no derived fields are indexed
    for (const field of [...this.exactFields, ...this.rangeFields]) {
      const fieldDef = FIELDS.find(f => f.key === field);
      if (fieldDef && fieldDef.type === 'derived') {
        throw new Error(`Derived field cannot use index: ${field}`);
      }
    }

    for (const field of this.exactFields) {
      this.exactIndices.set(field, new Map());
    }
    for (const field of this.rangeFields) {
      this.rangeIndices.set(field, new RangeIndex());
    }
    for (const asset of assets) {
      this.indexAsset(asset);
    }
  }

  indexAsset(asset: Asset) {
    if (!asset) return;
    
    for (const field of this.exactFields) {
      const value = this.getFieldValue(asset, field);
      if (Array.isArray(value)) {
        if (value.length === 0) {
          // Index empty array as 'none' to allow searching for empty collections
          this.addExact(field, 'none', asset.assetId);
        } else {
          for (const v of value) {
            this.addExact(field, v, asset.assetId);
          }
        }
      } else {
        this.addExact(field, value as IndexValue, asset.assetId);
      }
    }

    for (const field of this.rangeFields) {
      const value = this.getFieldValue(asset, field);
      if (typeof value === 'number') {
        if (field === 'ai.tags.length') {
          console.log(`[DEBUG] Indexing ai.tags.length for ${asset.assetId}: ${value}`);
        }
        this.rangeIndices.get(field)!.add(value, asset.assetId);
      }
    }
  }

  removeAsset(asset: Asset) {
    if (!asset) return;
    
    for (const field of this.exactFields) {
      const value = this.getFieldValue(asset, field);
      if (Array.isArray(value)) {
        if (value.length === 0) {
          this.removeExact(field, 'none', asset.assetId);
        } else {
          for (const v of value) {
            this.removeExact(field, v, asset.assetId);
          }
        }
      } else {
        this.removeExact(field, value as IndexValue, asset.assetId);
      }
    }

    for (const field of this.rangeFields) {
      const value = this.getFieldValue(asset, field);
      if (typeof value === 'number') {
        this.rangeIndices.get(field)!.remove(value, asset.assetId);
      }
    }
  }

  updateAsset(oldAsset: Asset, newAsset: Asset) {
    this.removeAsset(oldAsset);
    this.indexAsset(newAsset);
  }

  query(rule: RuleNode, allAssetIds: Set<string>): { ids: Set<string>, fullyResolved: boolean } {
    if (rule.type === 'condition') {
      const ids = this.queryCondition(rule, allAssetIds);
      if (ids !== null) {
        return { ids, fullyResolved: true };
      }
      return { ids: allAssetIds, fullyResolved: false };
    } else if (rule.type === 'group') {
      if (rule.children.length === 0) return { ids: allAssetIds, fullyResolved: true };
      
      if (rule.operator === 'AND') {
        let resultIds: Set<string> | null = null;
        let fullyResolved = true;

        for (const child of rule.children) {
          const childRes = this.query(child, allAssetIds);
          if (!childRes.fullyResolved) fullyResolved = false;
          
          if (resultIds === null) {
            resultIds = new Set(childRes.ids);
          } else {
            const intersection = new Set<string>();
            for (const id of resultIds) {
              if (childRes.ids.has(id)) intersection.add(id);
            }
            resultIds = intersection;
          }
          if (resultIds.size === 0) break;
        }
        
        return { ids: resultIds || allAssetIds, fullyResolved };
      } else if (rule.operator === 'OR') {
        const resultIds = new Set<string>();
        let fullyResolved = true;
        
        for (const child of rule.children) {
          const childRes = this.query(child, allAssetIds);
          if (!childRes.fullyResolved) {
            fullyResolved = false;
            return { ids: allAssetIds, fullyResolved: false };
          }
          for (const id of childRes.ids) {
            resultIds.add(id);
          }
        }
        return { ids: resultIds, fullyResolved };
      }
    }
    return { ids: allAssetIds, fullyResolved: false };
  }

  private queryCondition(cond: { field: string, operator: string, value: any }, allAssetIds: Set<string>): Set<string> | null {
    const fieldDef = FIELDS.find(f => f.key === cond.field);
    if (fieldDef && fieldDef.type === 'derived') {
      return null; // Derived fields cannot use index
    }

    // Handle array length operators by mapping to range fields
    if (cond.operator.startsWith('length')) {
      const lengthField = `${cond.field}.length`;
      if (this.rangeFields.includes(lengthField)) {
        const rangeIndex = this.rangeIndices.get(lengthField);
        if (rangeIndex && typeof cond.value === 'number') {
          const op = cond.operator.replace('length', '');
          const result = rangeIndex.getRange(op, cond.value);
          if (cond.field === 'ai.tags') {
            console.log(`[DEBUG] queryCondition ai.tags length${op} ${cond.value} -> found ${result.size} ids`);
          }
          return result;
        }
      }
      return null;
    }

    if (this.exactFields.includes(cond.field)) {
      if (cond.operator === '=') {
        if (cond.value === null) {
          const nullMatches = this.getExact(cond.field, null) || new Set<string>();
          const undefinedMatches = this.getExact(cond.field, undefined as any) || new Set<string>();
          const noneMatches = this.getExact(cond.field, 'none') || new Set<string>();
          
          const result = new Set<string>();
          nullMatches.forEach(id => result.add(id));
          undefinedMatches.forEach(id => result.add(id));
          noneMatches.forEach(id => result.add(id));
          return result;
        }
        return this.getExact(cond.field, cond.value) || new Set();
      } else if (cond.operator === '!=') {
        let exactMatch = new Set<string>();
        if (cond.value === null) {
          const nullMatches = this.getExact(cond.field, null) || new Set();
          const undefinedMatches = this.getExact(cond.field, undefined as any) || new Set();
          const noneMatches = this.getExact(cond.field, 'none') || new Set();
          for (const id of nullMatches) exactMatch.add(id);
          for (const id of undefinedMatches) exactMatch.add(id);
          for (const id of noneMatches) exactMatch.add(id);
        } else {
          exactMatch = this.getExact(cond.field, cond.value) || new Set();
        }
        const result = new Set<string>();
        for (const id of allAssetIds) {
          if (!exactMatch.has(id)) result.add(id);
        }
        return result;
      } else if (cond.operator === 'contains') {
        return this.getExact(cond.field, cond.value) || new Set();
      } else if (cond.operator === 'not_contains') {
        const containsMatch = this.getExact(cond.field, cond.value) || new Set();
        const result = new Set<string>();
        for (const id of allAssetIds) {
          if (!containsMatch.has(id)) result.add(id);
        }
        return result;
      } else if (cond.operator === 'exists') {
        const nullMatches = this.getExact(cond.field, null) || new Set();
        const undefinedMatches = this.getExact(cond.field, undefined as any) || new Set();
        const noneMatches = this.getExact(cond.field, 'none') || new Set();
        const result = new Set<string>();
        for (const id of allAssetIds) {
          if (!nullMatches.has(id) && !undefinedMatches.has(id) && !noneMatches.has(id)) result.add(id);
        }
        return result;
      } else if (cond.operator === 'not_exists') {
        const nullMatches = this.getExact(cond.field, null) || new Set();
        const undefinedMatches = this.getExact(cond.field, undefined as any) || new Set();
        const noneMatches = this.getExact(cond.field, 'none') || new Set();
        const result = new Set<string>();
        for (const id of nullMatches) result.add(id);
        for (const id of undefinedMatches) result.add(id);
        for (const id of noneMatches) result.add(id);
        return result;
      }
    }
    
    if (this.rangeFields.includes(cond.field)) {
      const rangeIndex = this.rangeIndices.get(cond.field);
      if (rangeIndex && typeof cond.value === 'number') {
        return rangeIndex.getRange(cond.operator, cond.value);
      }
    }
    return null;
  }

  getExact(field: string, value: IndexValue): Set<string> | undefined {
    return this.exactIndices.get(field)?.get(value);
  }

  private addExact(field: string, value: IndexValue, assetId: string) {
    const index = this.exactIndices.get(field)!;
    if (!index.has(value)) {
      index.set(value, new Set());
    }
    index.get(value)!.add(assetId);
  }

  private removeExact(field: string, value: IndexValue, assetId: string) {
    const index = this.exactIndices.get(field);
    if (index && index.has(value)) {
      index.get(value)!.delete(assetId);
    }
  }

  private getFieldValue(asset: any, field: string): any {
    if (!asset) return null;
    
    // Defensive access with defaults for AI fields
    if (field === 'ai.sceneType') return asset.ai?.sceneType ?? 'unknown';
    if (field === 'ai.tags') return asset.ai?.tags ?? [];
    if (field === 'ai.faces') return asset.ai?.faces ?? [];
    if (field === 'ai.faces.length') return asset.ai?.faces?.length ?? 0;
    if (field === 'ai.tags.length') return asset.ai?.tags?.length ?? 0;
    
    const parts = field.split('.');
    let value = asset;
    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof value !== 'object') {
        return null;
      }
      if (!(part in value)) {
        return null;
      }
      value = value[part];
    }
    return value !== undefined ? value : null;
  }
}

let instance: IndexManager | null = null;

export function initIndexManager(assets: Asset[]) {
  instance = new IndexManager(assets);
}

export function setIndexManager(manager: IndexManager | null) {
  instance = manager;
}

export function getIndexManager(): IndexManager | null {
  return instance;
}
