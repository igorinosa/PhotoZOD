import { Entity, Appearance } from './schema';
import { entityManager } from './entityManager';

export async function mergeEntities(entityAId: string, entityBId: string): Promise<Entity> {
  const entityA = await entityManager.get(entityAId);
  const entityB = await entityManager.get(entityBId);

  if (!entityA || !entityB) {
    throw new Error("One or both entities not found");
  }

  // Combine embeddings (Identity DNA)
  const mergedEmbeddings = [...entityA.embeddings, ...entityB.embeddings];

  // Combine thumbnails
  const mergedThumbnails = Array.from(new Set([...entityA.thumbnails, ...entityB.thumbnails]));

  // Combine assetIds
  const mergedAssetIds = Array.from(new Set([...entityA.assetIds, ...entityB.assetIds]));

  // Combine appearances
  const appearanceMap = new Map<string, Appearance>();
  for (const app of [...entityA.appearances, ...entityB.appearances]) {
    const key = `${app.assetId}_${app.faceBox.x}_${app.faceBox.y}`;
    appearanceMap.set(key, app);
  }
  const mergedAppearances = Array.from(appearanceMap.values());

  // Combine groupIds
  const mergedGroupIds = Array.from(new Set([...entityA.groupIds, ...entityB.groupIds]));

  // Combine metadata tags
  const tagsA = entityA.metadata?.tags || [];
  const tagsB = entityB.metadata?.tags || [];
  const mergedTags = Array.from(new Set([...tagsA, ...tagsB]));

  // Create new entity state for A
  const mergedEntity: Entity = {
    ...entityA,
    embeddings: mergedEmbeddings,
    thumbnails: mergedThumbnails,
    appearances: mergedAppearances,
    assetIds: mergedAssetIds,
    groupIds: mergedGroupIds,
    metadata: {
      ...entityA.metadata,
      ...entityB.metadata, // Merge other metadata fields
      tags: mergedTags
    }
  };

  // Save changes
  await entityManager.update(mergedEntity);

  // Delete entity B
  await entityManager.delete(entityBId);

  return mergedEntity;
}
