import { EditOperation, Version } from '../../shared/types';
import { versionStore } from './versionStore';

class LRUCache<K, V> {
  private max: number;
  private cache: Map<K, V>;

  constructor(max = 50) {
    this.max = max;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, val: V) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, val);
  }
  
  invalidate(key: K) {
    this.cache.delete(key);
  }
}

const versionCache = new LRUCache<string, EditOperation[]>(50);

export const diffEngine = {
  getFullStack: (versionId: string): EditOperation[] => {
    const cached = versionCache.get(versionId);
    if (cached) return cached;

    const path: Version[] = [];
    let currentId: string | null = versionId;
    let checkpointStack: EditOperation[] | null = null;

    while (currentId) {
      const v = versionStore.getVersion(currentId);
      if (!v) break;
      
      if (v.isCheckpoint && v.checkpointStack) {
        checkpointStack = [...v.checkpointStack];
        break;
      }
      
      path.unshift(v);
      currentId = v.parentVersionId;
    }

    const fullStack: EditOperation[] = checkpointStack ? [...checkpointStack] : [];
    
    for (const v of path) {
      if (v.delta) {
        for (const op of v.delta) {
          const existingIdx = fullStack.findIndex(e => e.type === op.type && ['exposure', 'contrast', 'rotate'].includes(op.type));
          if (existingIdx >= 0) {
            fullStack[existingIdx] = op;
          } else {
            fullStack.push(op);
          }
        }
      }
    }
    
    versionCache.set(versionId, fullStack);
    return fullStack;
  },
  
  invalidateDescendants: (assetId: string, parentVersionId: string, newVersionId: string) => {
    // 1. Maintain version graph index (built on the fly for the asset)
    const allVersions = versionStore.getVersionsForAsset(assetId);
    const childrenMap = new Map<string, string[]>();
    
    for (const v of allVersions) {
      if (v.parentVersionId) {
        if (!childrenMap.has(v.parentVersionId)) {
          childrenMap.set(v.parentVersionId, []);
        }
        childrenMap.get(v.parentVersionId)!.push(v.id);
      }
    }

    // 2. Traverse all descendants using BFS
    const affectedVersionIds = new Set<string>();
    const queue = [parentVersionId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      affectedVersionIds.add(current);
      
      const children = childrenMap.get(current) || [];
      for (const child of children) {
        if (!affectedVersionIds.has(child)) {
          queue.push(child);
        }
      }
    }

    // 3. Invalidate cache for all affected descendants
    affectedVersionIds.forEach(id => versionCache.invalidate(id));
    
    // 4. Also invalidate parentVersionId and newVersionId explicitly
    versionCache.invalidate(parentVersionId);
    versionCache.invalidate(newVersionId);
  }
};
