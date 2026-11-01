import { FaceData } from './schema';

export async function getEmbedding(face: FaceData): Promise<Float32Array> {
  // Simulate model inference
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Mock 512-dimensional embedding
  const embedding = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    // Deterministic pseudo-random based on bbox for testing
    // Use a non-integer multiplier so modulo 1.0 produces fractional values
    embedding[i] = ((face.bbox.x * 1.1) + (face.bbox.y * 1.3) + (i * 0.17)) % 1.0;
  }
  return embedding;
}
