import { PoseData } from './schema';

export async function estimatePose(image: Blob, seed?: string): Promise<PoseData> {
  // Simulate model inference (e.g., ViTPose)
  // In a real implementation, the seed would be used for deterministic inference if applicable
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return {
    keypoints: {
      head: { x: 200, y: 100 },
      shoulders: { left: { x: 150, y: 200 }, right: { x: 250, y: 200 } },
      elbows: { left: { x: 100, y: 300 }, right: { x: 300, y: 300 } },
      knees: { left: { x: 150, y: 500 }, right: { x: 250, y: 500 } }
    }
  };
}
