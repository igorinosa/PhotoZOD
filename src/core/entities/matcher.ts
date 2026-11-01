import { Entity } from './schema';
import { cosineSimilarity, SIMILARITY_THRESHOLDS } from './similarity';

export async function matchEntity(embedding: Float32Array, entities: Entity[]): Promise<Entity | null> {
  let bestMatch: Entity | null = null;
  let bestScore = 0;

  for (const entity of entities) {
    for (const emb of entity.embeddings) {
      const score = cosineSimilarity(embedding, emb);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entity;
      }
    }
  }

  if (bestScore > SIMILARITY_THRESHOLDS.HIGH_CONFIDENCE) {
    return bestMatch;
  }

  return null;
}
