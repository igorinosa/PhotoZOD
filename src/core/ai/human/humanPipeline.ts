import { processAllHumans } from './multiPerson';
import { ImageHumanStructure } from './schema';
import { storeHumanData } from '../../pipeline/cache/humanStore';
import { assignEntities } from '../../entities/pipeline';

export async function processHumans(assetId: string, image: Blob, groupId?: string): Promise<ImageHumanStructure> {
  console.log(`[Human Pipeline] Starting extraction for ${assetId} (group: ${groupId})...`);
  
  const humans = await processAllHumans(image, groupId || assetId);
  
  const structure: ImageHumanStructure = {
    assetId,
    humans,
    entityIds: []
  };
  
  if (humans.length > 0) {
    console.log(`[Human Pipeline] Assigning entities for ${humans.length} humans...`);
    structure.entityIds = await assignEntities(humans, assetId, image, groupId);
  }
  
  await storeHumanData(assetId, structure);
  
  console.log(`[Human Pipeline] Finished extraction for ${assetId}: found ${humans.length} humans.`);
  
  return structure;
}
