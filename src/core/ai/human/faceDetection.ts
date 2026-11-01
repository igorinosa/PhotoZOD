import { FaceData } from './schema';
import { detectFaces as realDetectFaces } from '../../face/faceDetection';

export async function detectFaces(image: Blob): Promise<FaceData[]> {
  const url = URL.createObjectURL(image);
  const img = new Image();
  img.src = url;
  await new Promise((resolve) => img.onload = resolve);
  
  const rawFaces = await realDetectFaces(img);
  URL.revokeObjectURL(url);

  return rawFaces.map(f => ({
    bbox: { x: f.bbox.x, y: f.bbox.y, w: f.bbox.width, h: f.bbox.height },
    confidence: f.confidence
  }));
}
