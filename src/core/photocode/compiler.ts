import { ASTNode } from './parser';
import { entityManager } from '../entities/entityManager';
import { FEATURE_REGISTRY, TARGET_REGISTRY } from '../system/featureRegistry';

export interface Operation {
  id: string;
  type: string;
  target?: string;
  params: any;
  condition?: string;
  seed?: string;
  scope: 'global' | 'mask' | 'entity' | 'conditional' | 'batch';
  priority: number;
  assetId?: string;
}

export const PRIORITY = {
  global: 1,
  mask: 2,
  entity: 3,
  conditional: 4,
  batch: 5
};

export class Compiler {
  private opCount = 0;

  async compile(ast: ASTNode[], defaultAssetId?: string): Promise<Operation[]> {
    const ops: Operation[] = [];
    this.opCount = 0;

    // 0D.6: Extract global seed if present
    const seedNode = ast.find(n => n.type === 'Seed');
    const globalSeed = seedNode?.seed;

    const isTarget = (name?: string) => name && TARGET_REGISTRY.includes(name);

    const processNodes = (nodes: ASTNode[], prefix: string = '', target?: string) => {
      for (const node of nodes) {
        if (node.type === 'Operation') {
          let type = node.name || '';
          if (prefix) {
            type = `${prefix}.${type}`;
          }

          ops.push({
            id: `op_${this.opCount++}`,
            type: type,
            target: target,
            params: { value: this.parseValue(node.value) },
            scope: target ? 'mask' : 'global',
            priority: target ? PRIORITY.mask : PRIORITY.global,
            assetId: defaultAssetId,
            seed: globalSeed
          });
        } else if (node.type === 'Target') {
          if (node.children) {
            const newPrefix = prefix ? `${prefix}.${node.name}` : node.name || '';
            const normalizedPrefix = newPrefix.toLowerCase().replace(/\s+/g, '');
            const isOperation = Object.keys(FEATURE_REGISTRY).some(
              k => k.toLowerCase().replace(/\s+/g, '') === normalizedPrefix
            );

            if (isOperation) {
              const params: any = {};
              for (const child of node.children) {
                if (child.type === 'Operation') {
                  const key = (child.name || '').toLowerCase();
                  params[key] = this.parseValue(child.value);
                }
              }
              
              const actualKey = Object.keys(FEATURE_REGISTRY).find(
                k => k.toLowerCase().replace(/\s+/g, '') === normalizedPrefix
              ) || newPrefix;

              ops.push({
                id: `op_${this.opCount++}`,
                type: actualKey,
                target: target,
                params: params,
                scope: target ? 'mask' : 'global',
                priority: target ? PRIORITY.mask : PRIORITY.global,
                assetId: defaultAssetId,
                seed: globalSeed
              });
            } else {
              processNodes(node.children, newPrefix, isTarget(node.name) ? node.name : target);
            }
          }
        } else if (node.type === 'ConditionalBlock' && node.children) {
          // ... handle conditional blocks if needed in recursion
          // For simplicity, let's keep the original logic for top-level blocks but maybe refactor later
        }
      }
    };

    for (const node of ast) {
      if (node.type === 'Operation') {
        ops.push({
          id: `op_${this.opCount++}`,
          type: node.name || '',
          params: { value: this.parseValue(node.value) },
          scope: 'global',
          priority: PRIORITY.global,
          assetId: defaultAssetId,
          seed: globalSeed
        });
      } else if (node.type === 'Target') {
        if (node.children) {
          const normalizedPrefix = (node.name || '').toLowerCase().replace(/\s+/g, '');
          const isOperation = Object.keys(FEATURE_REGISTRY).some(
            k => k.toLowerCase().replace(/\s+/g, '') === normalizedPrefix
          );

          if (isOperation) {
            const params: any = {};
            for (const child of node.children) {
              if (child.type === 'Operation') {
                const key = (child.name || '').toLowerCase();
                params[key] = this.parseValue(child.value);
              }
            }
            
            const actualKey = Object.keys(FEATURE_REGISTRY).find(
              k => k.toLowerCase().replace(/\s+/g, '') === normalizedPrefix
            ) || node.name || '';

            ops.push({
              id: `op_${this.opCount++}`,
              type: actualKey,
              target: isTarget(node.name) ? node.name : undefined,
              params: params,
              scope: 'global',
              priority: PRIORITY.global,
              assetId: defaultAssetId,
              seed: globalSeed
            });
          } else {
            processNodes(node.children, node.name || '', isTarget(node.name) ? node.name : undefined);
          }
        }
      } else if (node.type === 'EntityBlock') {
        // ... keep existing entity block logic ...
        const entityName = node.entityName?.replace(/['"]/g, '');
        const entity = entityName ? (await entityManager.getByName(entityName) || await entityManager.get(entityName)) : undefined;
        
        if (entity && node.children) {
          const assetIds = entity.appearances.map(a => a.assetId);
          const uniqueAssetIds = [...new Set(assetIds)];
          
          for (const aId of uniqueAssetIds) {
            const processEntityNodes = (nodes: ASTNode[], prefix: string = '', subTarget?: string) => {
              for (const child of nodes) {
                if (child.type === 'Operation') {
                  let type = child.name || '';
                  if (prefix) type = `${prefix}.${type}`;

                  ops.push({
                    id: `op_${this.opCount++}`,
                    type: type,
                    target: subTarget || entity.id,
                    params: { value: this.parseValue(child.value) },
                    scope: 'entity',
                    priority: PRIORITY.entity,
                    assetId: aId,
                    seed: globalSeed
                  });
                } else if (child.type === 'Target' && child.children) {
                  const newPrefix = prefix ? `${prefix}.${child.name}` : child.name || '';
                  processEntityNodes(child.children, newPrefix, child.name);
                }
              }
            };
            processEntityNodes(node.children);
          }
        }
      } else if (node.type === 'ConditionalBlock') {
        // ... keep existing conditional block logic ...
        if (node.children) {
          for (const child of node.children) {
            if (child.type === 'Operation') {
              ops.push({
                id: `op_${this.opCount++}`,
                type: child.name || '',
                params: { value: this.parseValue(child.value) },
                condition: node.expression,
                scope: 'conditional',
                priority: PRIORITY.conditional,
                assetId: defaultAssetId,
                seed: globalSeed
              });
            }
          }
        }
      } else if (node.type === 'BatchBlock') {
        // ... keep existing batch block logic ...
        if (node.children) {
          for (const child of node.children) {
            if (child.type === 'Operation') {
              ops.push({
                id: `op_${this.opCount++}`,
                type: child.name || '',
                params: { value: this.parseValue(child.value) },
                scope: 'batch',
                priority: PRIORITY.batch,
                assetId: undefined,
                seed: globalSeed
              });
            }
          }
        }
      }
    }

    return ops;
  }
  
  private parseValue(val?: string): any {
    if (!val) return 0;
    const cleaned = val.replace(/['"]/g, '');
    // Only parse as number if it's a valid numeric string without trailing non-numeric characters
    if (/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
      return parseFloat(cleaned);
    }
    return cleaned;
  }
}
