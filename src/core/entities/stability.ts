import { Entity } from './schema';
import { cosineSimilarity, SIMILARITY_THRESHOLDS } from './similarity';

export async function stabilizeEntity(entity: Entity): Promise<Entity> {
  if (!entity.embeddings || entity.embeddings.length <= 1) return entity;

  // Calculate centroid
  const dim = entity.embeddings[0].length;
  const centroid = new Float32Array(dim);
  for (const emb of entity.embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    centroid[i] /= entity.embeddings.length;
  }

  // Filter outliers (Drift Prevention Layer)
  const stableEmbeddings = entity.embeddings.filter(emb => {
    const sim = cosineSimilarity(emb, centroid);
    return sim >= SIMILARITY_THRESHOLDS.UNCERTAIN; // Reject if too far from centroid
  });

  // If all were rejected (unlikely but possible), keep the original
  if (stableEmbeddings.length === 0) {
    return { ...entity };
  }

  return {
    ...entity,
    embeddings: stableEmbeddings
  };
}
