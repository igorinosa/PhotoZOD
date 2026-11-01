export const SIMILARITY_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.85, // > 0.85 -> same person
  UNCERTAIN: 0.65,       // 0.65 - 0.85 -> uncertain
  DIFFERENT: 0.65        // < 0.65 -> different
};

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length");
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) return 0;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function entitySimilarity(embeddingsA: Float32Array[], embeddingsB: Float32Array[]): number {
  if (embeddingsA.length === 0 || embeddingsB.length === 0) return 0;

  let maxSim = -1;
  for (const a of embeddingsA) {
    for (const b of embeddingsB) {
      const sim = cosineSimilarity(a, b);
      if (sim > maxSim) maxSim = sim;
    }
  }
  return maxSim;
}
