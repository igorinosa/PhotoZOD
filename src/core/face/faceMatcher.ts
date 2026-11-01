import { Face, PersonEntity } from '../../shared/types';
import { useFaceSettings } from './faceSettings';

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function geometrySimilarity(face: Face, entityFace: Face): number {
  // Compare eye distance, face ratio, landmark distances
  // FaceDetector returns 6 keypoints:
  // 0: Right eye, 1: Left eye, 2: Nose tip, 3: Mouth center, 4: Right ear, 5: Left ear
  
  const getEyeDistance = (landmarks: number[][]) => {
    if (!landmarks || landmarks.length < 2) return 0;
    // Assuming 0 is right eye and 1 is left eye based on MediaPipe FaceDetector
    const right = landmarks[0];
    const left = landmarks[1];
    if (!right || !left) return 0;
    return Math.sqrt(
      Math.pow(left[0] - right[0], 2) + 
      Math.pow(left[1] - right[1], 2)
    );
  };
  
  const getFaceRatio = (bbox: { width: number; height: number }) => {
    if (!bbox || bbox.height === 0) return 1;
    return bbox.width / bbox.height;
  };

  const distA = getEyeDistance(face.landmarks);
  const distB = getEyeDistance(entityFace.landmarks);
  
  const ratioA = getFaceRatio(face.bbox);
  const ratioB = getFaceRatio(entityFace.bbox);
  
  // Simple similarity score based on these ratios
  const ratioSim = 1 - Math.min(1, Math.abs(ratioA - ratioB));
  const eyeSim = distA === 0 || distB === 0 ? 0.5 : 1 - Math.min(1, Math.abs(distA - distB) / Math.max(distA, distB));
  
  return (ratioSim + eyeSim) / 2;
}

export function matchFaceToEntity(
  face: Face, 
  entities: PersonEntity[], 
  allFaces: Record<string, Face>
): string | null {
  let bestMatch: { id: string, score: number } | null = null;

  for (const entity of entities) {
    const embeddingSim = cosineSimilarity(face.embedding, entity.embedding);
    
    // For geometry, we might need a representative face from the entity
    const repFaceId = entity.coverFaceId || entity.faceIds[0];
    const repFace = allFaces[repFaceId];
    
    let geoSim = 0.7; // Default if no rep face
    if (repFace) {
      geoSim = geometrySimilarity(face, repFace);
    }

    const { thresholdValue } = useFaceSettings.getState();
    const geoThreshold = thresholdValue - 0.1; // Geometry is usually a bit lower

    if (embeddingSim > thresholdValue && geoSim > geoThreshold) {
      const totalScore = (embeddingSim + geoSim) / 2;
      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = { id: entity.id, score: totalScore };
      }
    }
  }
  
  return bestMatch ? bestMatch.id : null;
}

export function compareFaceSets(facesA: Face[], facesB: Face[]): number {
  if (facesA.length === 0 || facesB.length === 0) return 0;
  if (facesA.length !== facesB.length) return 0; // For near-duplicates, usually same number of people

  let totalSim = 0;
  let matches = 0;

  for (const faceA of facesA) {
    let bestSim = 0;
    for (const faceB of facesB) {
      const sim = cosineSimilarity(faceA.embedding, faceB.embedding);
      if (sim > bestSim) bestSim = sim;
    }
    if (bestSim > 0.9) { // High threshold for near-duplicates
      totalSim += bestSim;
      matches++;
    }
  }

  return matches === facesA.length ? totalSim / matches : 0;
}
