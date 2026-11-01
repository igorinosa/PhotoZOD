import { detectFaces } from './faceDetection';
import { extractLandmarks } from './landmarks';
import { getEmbedding } from './embedding';
import { estimatePose } from './pose';
import { estimateBody } from './body';
import { HumanData } from './schema';
import { detectBlink } from './blinkDetection';

export async function processAllHumans(image: Blob, seed?: string): Promise<HumanData[]> {
  const faces = await detectFaces(image);
  
  return Promise.all(faces.map(async (face, index) => {
    const landmarks = await extractLandmarks(face);
    const embedding = await getEmbedding(face);
    // In a real implementation, pose and body would be associated with the specific face/person crop
    const pose = await estimatePose(image, seed); 
    const body = await estimateBody(image, seed);
    
    const blink = detectBlink(landmarks);
    
    return {
      id: `human_${Date.now()}_${index}`,
      face,
      landmarks,
      embedding,
      pose,
      body,
      blink
    };
  }));
}
