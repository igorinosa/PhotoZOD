import { Entity } from './schema';
import { entityManager } from './entityManager';
import { cosineSimilarity } from './similarity';

function kMeans(embeddings: Float32Array[], k: number = 2, maxIter: number = 10): Float32Array[][] {
  if (embeddings.length <= k) {
    return embeddings.map(e => [e]);
  }

  const dim = embeddings[0].length;
  // Initialize centroids deterministically from existing embeddings
  let centroids: Float32Array[] = [];
  for (let i = 0; i < k; i++) {
    const idx = i % embeddings.length;
    centroids.push(new Float32Array(embeddings[idx]));
  }

  let clusters: Float32Array[][] = Array.from({ length: k }, () => []);

  for (let iter = 0; iter < maxIter; iter++) {
    clusters = Array.from({ length: k }, () => []);
    
    // Assign to nearest centroid
    for (const emb of embeddings) {
      let bestSim = -1;
      let bestCluster = 0;
      for (let i = 0; i < k; i++) {
        const sim = cosineSimilarity(emb, centroids[i]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = i;
        }
      }
      clusters[bestCluster].push(emb);
    }

    // Update centroids
    let changed = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      const newCentroid = new Float32Array(dim);
      for (const emb of clusters[i]) {
        for (let d = 0; d < dim; d++) {
          newCentroid[d] += emb[d];
        }
      }
      for (let d = 0; d < dim; d++) {
        newCentroid[d] /= clusters[i].length;
      }
      
      // Check if changed
      const sim = cosineSimilarity(centroids[i], newCentroid);
      if (sim < 0.999) changed = true;
      
      centroids[i] = newCentroid;
    }

    if (!changed) break;
  }

  return clusters;
}

export async function splitEntity(entityId: string, assetIdsToSplit: string[]): Promise<{ original: Entity, newEntity: Entity }> {
  const entity = await entityManager.get(entityId);
  if (!entity) throw new Error("Entity not found");

  // Separate assetIds
  const splitSet = new Set(assetIdsToSplit);
  const remainingAssetIds = entity.assetIds.filter(id => !splitSet.has(id));
  const splitAssetIds = entity.assetIds.filter(id => splitSet.has(id));

  // Separate appearances
  const remainingAppearances = entity.appearances.filter(a => !splitSet.has(a.assetId));
  const splitAppearances = entity.appearances.filter(a => splitSet.has(a.assetId));

  // Split embeddings using k-means
  // If we don't have enough embeddings to split, we just copy them or split them arbitrarily
  let remainingEmbeddings: Float32Array[] = [];
  let splitEmbeddings: Float32Array[] = [];

  if (entity.embeddings.length >= 2) {
    const clusters = kMeans(entity.embeddings, 2);
    // Assign the larger cluster to the original entity, or based on some heuristic
    // For simplicity, we just assign cluster 0 to remaining, cluster 1 to split
    remainingEmbeddings = clusters[0] || [];
    splitEmbeddings = clusters[1] || [];
    if (remainingEmbeddings.length === 0) remainingEmbeddings = [...entity.embeddings];
    if (splitEmbeddings.length === 0) splitEmbeddings = [...entity.embeddings];
  } else {
    remainingEmbeddings = [...entity.embeddings];
    splitEmbeddings = [...entity.embeddings];
  }

  // Update original entity
  const updatedOriginal: Entity = {
    ...entity,
    assetIds: remainingAssetIds,
    appearances: remainingAppearances,
    embeddings: remainingEmbeddings
  };

  // Create new entity
  const now = Date.now();
  const newEntityId = `entity_${entityId.substring(0, 4)}_${now}`;
  const newEntity: Entity = {
    id: newEntityId,
    type: entity.type,
    embeddings: splitEmbeddings,
    thumbnails: entity.thumbnails.slice(0, 1), // Just take the first thumbnail for now
    appearances: splitAppearances,
    assetIds: splitAssetIds,
    groupIds: [], // GroupIds should be re-evaluated or split based on assets
    metadata: {
      name: `${entity.metadata?.name || 'Unknown'} (Split)`,
      tags: [...(entity.metadata?.tags || [])]
    }
  };

  // Save changes
  await entityManager.update(updatedOriginal);
  await entityManager.create(newEntity);

  return { original: updatedOriginal, newEntity: newEntity };
}
