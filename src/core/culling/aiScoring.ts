import { Asset } from '../dam/types';

export interface AIScoreResult {
  sharpnessScore: number;
  aestheticScore: number;
  faceDetected: boolean;
  brightnessScore: number;
  qualityScore: number;
  closedEyesScore: number;
  blurScore: number;
  poorLightScore: number;
  aiScore: number;
  suggestion: "keep" | "maybe" | "trash";
}

export function calculateAIScore(asset: Asset): AIScoreResult {
  // 1. EXTRACT SIGNALS
  const sharpness = asset.sharpnessScore ?? 0.5;
  const aesthetic = asset.aestheticScore ?? 0.5;
  const brightness = asset.brightnessScore ?? 0.5;
  const quality = asset.qualityScore ?? 0.5;
  const closedEyes = asset.closedEyesScore ?? 0; // 0 = open, 1 = closed
  const blur = asset.blurScore ?? 0; // 0 = sharp, 1 = blurry
  const poorLight = asset.poorLightScore ?? 0; // 0 = good, 1 = poor
  const faceDetected = (asset.ai?.faces?.length ?? 0) > 0;

  // 2. WEIGHTED SCORING
  // Sharpness and Quality are critical.
  // Aesthetic and Brightness are important.
  // Closed eyes, blur, and poor light are negative factors.
  
  let score = (sharpness * 0.3) + (quality * 0.3) + (aesthetic * 0.2) + (brightness * 0.2);
  
  // Apply negative penalties
  score -= (closedEyes * 0.5);
  score -= (blur * 0.4);
  score -= (poorLight * 0.3);

  // Normalize score
  const aiScore = Math.max(0, Math.min(1, score));

  // 3. SUGGESTION LOGIC
  let suggestion: "keep" | "maybe" | "trash" = "maybe";
  
  if (sharpness < 0.2 || blur > 0.6 || poorLight > 0.7) {
    suggestion = "trash";
  } else if (closedEyes > 0.8) {
    suggestion = "trash";
  } else if (aiScore > 0.7) {
    suggestion = "keep";
  } else if (aiScore < 0.3) {
    suggestion = "trash";
  }

  return {
    sharpnessScore: sharpness,
    aestheticScore: aesthetic,
    faceDetected,
    brightnessScore: brightness,
    qualityScore: quality,
    closedEyesScore: closedEyes,
    blurScore: blur,
    poorLightScore: poorLight,
    aiScore,
    suggestion
  };
}
