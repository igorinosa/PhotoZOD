import { Entity } from './schema';
import { entitySimilarity, SIMILARITY_THRESHOLDS } from './similarity';

export interface MergeSuggestion {
  entityA: string;
  entityB: string;
  confidence: number;
}

// Custom LSH (Locality Sensitive Hashing) for Cosine Similarity
// This provides an Approximate Nearest Neighbor (ANN) search to avoid O(N^2)
class LSHIndex {
  private tables: Array<{
    planes: Float32Array[];
    buckets: Map<number, string[]>;
  }> = [];

  constructor(dim: number, numTables: number = 5, numPlanes: number = 10) {
    for (let t = 0; t < numTables; t++) {
      const planes: Float32Array[] = [];
      for (let i = 0; i < numPlanes; i++) {
        const plane = new Float32Array(dim);
        for (let j = 0; j < dim; j++) {
          // Deterministic pseudo-random planes
          const seed = t * numPlanes + i + j;
          plane[j] = Math.sin(seed) * 2; // Simple deterministic wave
        }
        planes.push(plane);
      }
      this.tables.push({ planes, buckets: new Map() });
    }
  }

  private hash(vector: Float32Array, planes: Float32Array[]): number {
    let h = 0;
    for (let i = 0; i < planes.length; i++) {
      let dot = 0;
      for (let j = 0; j < vector.length; j++) {
        dot += vector[j] * planes[i][j];
      }
      if (dot > 0) {
        h |= (1 << i);
      }
    }
    return h;
  }

  add(id: string, vector: Float32Array) {
    for (const table of this.tables) {
      const h = this.hash(vector, table.planes);
      if (!table.buckets.has(h)) {
        table.buckets.set(h, []);
      }
      table.buckets.get(h)!.push(id);
    }
  }

  getCandidates(vector: Float32Array): Set<string> {
    const candidates = new Set<string>();
    for (const table of this.tables) {
      const h = this.hash(vector, table.planes);
      const bucket = table.buckets.get(h);
      if (bucket) {
        for (const id of bucket) {
          candidates.add(id);
        }
      }
    }
    return candidates;
  }
}

export async function detectMerges(entities: Entity[]): Promise<MergeSuggestion[]> {
  const suggestions: MergeSuggestion[] = [];
  if (entities.length < 2) return suggestions;

  // Assume 512D embeddings
  const dim = entities[0].embeddings[0]?.length || 512;
  const index = new LSHIndex(dim);

  // Build index
  const entityMap = new Map<string, Entity>();
  for (const entity of entities) {
    entityMap.set(entity.id, entity);
    for (const emb of entity.embeddings) {
      index.add(entity.id, emb);
    }
  }

  const processedPairs = new Set<string>();

  // Find candidates
  for (const entityA of entities) {
    const candidateIds = new Set<string>();
    for (const emb of entityA.embeddings) {
      const cands = index.getCandidates(emb);
      for (const c of cands) candidateIds.add(c);
    }

    for (const idB of candidateIds) {
      if (entityA.id === idB) continue;
      
      // Create a unique pair key to avoid A->B and B->A
      const pairKey = [entityA.id, idB].sort().join('|');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const entityB = entityMap.get(idB)!;
      const sim = entitySimilarity(entityA.embeddings, entityB.embeddings);

      if (sim > SIMILARITY_THRESHOLDS.HIGH_CONFIDENCE) {
        suggestions.push({
          entityA: entityA.id,
          entityB: entityB.id,
          confidence: sim
        });
      }
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
