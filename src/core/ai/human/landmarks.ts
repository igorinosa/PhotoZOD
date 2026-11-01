import { FaceData, Landmarks } from './schema';

export async function extractLandmarks(face: FaceData): Promise<Landmarks> {
  // Simulate model inference
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const leftEyeX = face.bbox.x + 50;
  const leftEyeY = face.bbox.y + 50;
  const rightEyeX = face.bbox.x + 150;
  const rightEyeY = face.bbox.y + 50;

  // Simulate 6 points for EAR calculation
  const leftEye = [
    { x: leftEyeX - 10, y: leftEyeY }, // p1
    { x: leftEyeX - 5, y: leftEyeY - 5 }, // p2
    { x: leftEyeX + 5, y: leftEyeY - 5 }, // p3
    { x: leftEyeX + 10, y: leftEyeY }, // p4
    { x: leftEyeX + 5, y: leftEyeY + 5 }, // p5
    { x: leftEyeX - 5, y: leftEyeY + 5 }  // p6
  ];

  const rightEye = [
    { x: rightEyeX - 10, y: rightEyeY }, // p1
    { x: rightEyeX - 5, y: rightEyeY - 5 }, // p2
    { x: rightEyeX + 5, y: rightEyeY - 5 }, // p3
    { x: rightEyeX + 10, y: rightEyeY }, // p4
    { x: rightEyeX + 5, y: rightEyeY + 5 }, // p5
    { x: rightEyeX - 5, y: rightEyeY + 5 }  // p6
  ];

  return {
    eyes: [{ x: leftEyeX, y: leftEyeY }, { x: rightEyeX, y: rightEyeY }],
    leftEye,
    rightEye,
    nose: [{ x: face.bbox.x + 100, y: face.bbox.y + 100 }],
    mouth: [{ x: face.bbox.x + 100, y: face.bbox.y + 150 }],
    jaw: [{ x: face.bbox.x + 100, y: face.bbox.y + 200 }],
    faceRegion: face.bbox
  };
}
