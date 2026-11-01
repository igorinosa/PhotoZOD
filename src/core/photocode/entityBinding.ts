import { entityManager } from '../entities/entityManager';
import { Entity } from '../entities/schema';

export async function resolveEntityTarget(entityId: string): Promise<Entity | undefined> {
  return await entityManager.get(entityId);
}
