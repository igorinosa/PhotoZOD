import { HumanData } from '../ai/human/schema';
import { entityManager } from './entityManager';
export { entityManager };
import { matchEntity } from './matcher';
import { updateEntity } from './updater';
import { createEntity } from './builder';
import { extractThumbnail } from './thumbnail';

export async function assignEntities(humans: HumanData[], assetId: string, image: Blob, groupId?: string): Promise<string[]> {
  const entities = await entityManager.getAll();
  const assignedIds: string[] = [];

  for (const human of humans) {
    const match = await matchEntity(human.embedding, entities);
    
    // Generate thumbnail for the face
    let thumbnail: string | undefined;
    try {
      thumbnail = await extractThumbnail(image, human.face.bbox);
    } catch (err) {
      console.warn(`[Entity Pipeline] Failed to extract thumbnail for human in ${assetId}`, err);
    }

    if (match) {
      updateEntity(match, human.embedding, assetId, { assetId, groupId, faceBox: human.face.bbox }, thumbnail, groupId);
      await entityManager.update(match);
      assignedIds.push(match.id);
      console.log(`[Entity Pipeline] Matched human to existing entity ${match.id}`);
    } else {
      const newEntity = createEntity(
        human.embedding,
        assetId,
        { assetId, groupId, faceBox: human.face.bbox },
        thumbnail,
        groupId
      );
      await entityManager.create(newEntity);
      entities.push(newEntity); // Add to local array for subsequent matches in the same batch
      assignedIds.push(newEntity.id);
      console.log(`[Entity Pipeline] Created new entity ${newEntity.id}`);
    }
  }
  
  return assignedIds;
}
