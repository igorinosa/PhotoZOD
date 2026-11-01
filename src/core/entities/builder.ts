import { Entity, EntityType, Appearance } from './schema';

export function createEntity(
  embedding: Float32Array, 
  assetId: string, 
  appearance: Appearance,
  thumbnail?: string, 
  groupId?: string,
  type: EntityType = 'person'
): Entity {
  return {
    id: `entity_${assetId.substring(0, 8)}`,
    type,
    embeddings: [embedding],
    thumbnails: thumbnail ? [thumbnail] : [],
    appearances: [appearance],
    assetIds: [assetId],
    groupIds: groupId ? [groupId] : [],
    metadata: {
      name: `Person ${assetId.substring(0, 4)}`,
      tags: []
    }
  };
}
