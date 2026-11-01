import { entityManager } from './entityManager';
import { recomputeEntityConfidence } from './confidence';
import { stabilizeEntity } from './stability';

export async function recomputeEntityGraph(entityId: string): Promise<void> {
  const entity = await entityManager.get(entityId);
  if (!entity) return;

  // 1. Stabilize (Drift Prevention)
  const stabilized = await stabilizeEntity(entity);

  // 2. Recompute confidence
  const confidence = await recomputeEntityConfidence(stabilized);
  stabilized.confidence = confidence;

  // 3. Update indexes (handled by entityManager.update)
  await entityManager.update(stabilized);
}
