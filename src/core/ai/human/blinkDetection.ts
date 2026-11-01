import { Landmarks } from './schema';
import { calculateEAR, Point } from './ear';

const BLINK_THRESHOLD = 0.2;

export interface BlinkResult {
  leftEAR: number;
  rightEAR: number;
  isBlinking: boolean;
}

/**
 * Detects if a person is blinking based on facial landmarks using EAR.
 */
export function detectBlink(landmarks: Landmarks): BlinkResult {
  let leftEAR = 0;
  let rightEAR = 0;

  if (landmarks.leftEye && landmarks.leftEye.length === 6) {
    const p = landmarks.leftEye;
    leftEAR = calculateEAR(p[0], p[1], p[2], p[3], p[4], p[5]);
  }

  if (landmarks.rightEye && landmarks.rightEye.length === 6) {
    const p = landmarks.rightEye;
    rightEAR = calculateEAR(p[0], p[1], p[2], p[3], p[4], p[5]);
  }

  // A blink is detected if both eyes are closed below the threshold
  // or if we only have one eye and it's closed.
  const isBlinking = (leftEAR > 0 && leftEAR < BLINK_THRESHOLD) || 
                     (rightEAR > 0 && rightEAR < BLINK_THRESHOLD);

  return {
    leftEAR,
    rightEAR,
    isBlinking
  };
}
