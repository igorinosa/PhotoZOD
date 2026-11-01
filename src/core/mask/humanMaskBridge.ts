import { Landmarks, BBox } from '../ai/human/schema';

export interface Mask {
  type: 'rect' | 'polygon';
  data: any;
}

export function generateMask(region: BBox): Mask {
  return {
    type: 'rect',
    data: region
  };
}

export function faceMaskFromLandmarks(landmarks: Landmarks): Mask {
  return generateMask(landmarks.faceRegion);
}

export function eyesMaskFromLandmarks(landmarks: Landmarks): Mask[] {
  // Approximate eye regions from landmarks
  return landmarks.eyes.map(eye => ({
    type: 'rect',
    data: { x: eye.x - 10, y: eye.y - 10, w: 20, h: 20 }
  }));
}
