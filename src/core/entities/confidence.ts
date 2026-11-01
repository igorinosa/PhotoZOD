import { Entity } from './schema';
import { cosineSimilarity } from './similarity';

export async function recomputeEntityConfidence(entity: Entity): Promise<number> {
  if (!entity.embeddings || entity.embeddings.length <= 1) return 1.0;

  // Calculate cluster density (average pairwise similarity)
  let totalSim = 0;
  let count = 0;

  for (let i = 0; i < entity.embeddings.length; i++) {
    for (let j = i + 1; j < entity.embeddings.length; j++) {
      totalSim += cosineSimilarity(entity.embeddings[i], entity.embeddings[j]);
      count++;
    }
  }

  if (count === 0) return 1.0;
  return totalSim / count;
}
