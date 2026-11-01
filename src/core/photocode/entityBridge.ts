import { Operation, PRIORITY } from './compiler';
import { entityManager } from '../entities/entityManager';

export class EntityBridge {
  async resolveEntityOperations(entityNameOrId: string, operations: any[]): Promise<Operation[]> {
    const entity = await entityManager.getByName(entityNameOrId) || await entityManager.get(entityNameOrId);
    
    if (!entity) {
      console.warn(`[EntityBridge] Entity not found: ${entityNameOrId}`);
      return [];
    }

    const assets = await entityManager.getAssetsForEntity(entity.id);
    const resolvedOps: Operation[] = [];

    for (const assetId of assets) {
      let opIndex = 0;
      for (const op of operations) {
        resolvedOps.push({
          id: `op_${entity.id}_${assetId}_${op.type}_${opIndex++}`,
          type: op.type,
          target: entity.id,
          params: op.params,
          scope: 'entity',
          priority: PRIORITY.entity,
          assetId: assetId
        });
      }
    }

    return resolvedOps;
  }
}

export const entityBridge = new EntityBridge();
