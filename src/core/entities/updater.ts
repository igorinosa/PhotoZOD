import { Entity, Appearance } from './schema';

export function updateEntity(
  entity: Entity, 
  embedding: Float32Array, 
  assetId: string, 
  appearance: Appearance,
  thumbnail?: string, 
  groupId?: string
): Entity {
  const assetIds = entity.assetIds || [];
  const groupIds = entity.groupIds || [];
  const thumbnails = entity.thumbnails || [];
  const appearances = entity.appearances || [];
  const embeddings = entity.embeddings || [];

  // Check if we already have an appearance in this photo family
  const hasAsset = assetIds.includes(assetId);
  const hasGroup = groupId && groupIds.includes(groupId);
  
  if (!hasAsset) {
    entity.assetIds = [...assetIds, assetId];
    entity.appearances = [...appearances, appearance];
    // Only add embedding if it's a new asset, to avoid DNA bloat
    entity.embeddings = [...embeddings, embedding];
  }
  
  if (groupId && !hasGroup) {
    entity.groupIds = [...groupIds, groupId];
  }

  if (thumbnail && !thumbnails.includes(thumbnail)) {
    entity.thumbnails = [...thumbnails, thumbnail];
  }

  return entity;
}
