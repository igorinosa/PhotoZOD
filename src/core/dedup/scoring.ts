import { Asset } from "./cluster";

export type ScoreBreakdown = {
  sharpness: number
  exposure: number
  noise: number
  resolution: number
  faceQuality: number
  total: number
}

// Stubs for image processing functions
const laplacianVariance = (image: any): number => 500; // Placeholder
const getLuminanceHistogram = (image: any): number[] => [0.5]; // Placeholder
const measureMidtones = (histogram: number[]): number => 0.8; // Placeholder
const estimateNoise = (image: any): number => 10; // Placeholder
const normalize = (val: number, min: number, max: number): number => Math.max(0, Math.min(1, (val - min) / (max - min)));
const MAX_PIXELS = 20000000; // 20MP

const scoreCache: Record<string, ScoreBreakdown> = {};

function computeSharpness(image: any): number {
  const variance = laplacianVariance(image);
  return normalize(variance, 0, 1000);
}

function computeExposure(image: any): number {
  const histogram = getLuminanceHistogram(image);
  return measureMidtones(histogram);
}

function computeNoise(image: any): number {
  const noise = estimateNoise(image);
  return 1 - normalize(noise, 0, 100);
}

function computeResolution(image: any): number {
  const pixels = (image.width || 0) * (image.height || 0);
  return normalize(pixels, 0, MAX_PIXELS);
}

function computeFaceQuality(image: any, metadata: { faces: { clarityScore: number }[] }): number {
  if (!metadata.faces || metadata.faces.length === 0) return 0.5;
  return metadata.faces.reduce((acc, face) => acc + face.clarityScore, 0) / metadata.faces.length;
}

function computeTotalScore(scores: ScoreBreakdown): number {
  return (
    scores.sharpness * 0.35 +
    scores.exposure * 0.2 +
    scores.noise * 0.15 +
    scores.resolution * 0.1 +
    scores.faceQuality * 0.2
  );
}

export function scoreImage(image: any, metadata: { faces: { clarityScore: number }[] }): ScoreBreakdown {
  const sharpness = computeSharpness(image);
  const exposure = computeExposure(image);
  const noise = computeNoise(image);
  const resolution = computeResolution(image);
  const faceQuality = computeFaceQuality(image, metadata);

  const total = computeTotalScore({
    sharpness,
    exposure,
    noise,
    resolution,
    faceQuality,
    total: 0
  });

  return {
    sharpness,
    exposure,
    noise,
    resolution,
    faceQuality,
    total
  };
}

export function pickBestImage(cluster: { seed: Asset, members: Asset[] }): Asset {
  let best = cluster.members[0];
  let bestScore = -1;

  for (const asset of cluster.members) {
    if (!scoreCache[asset.assetId]) {
      scoreCache[asset.assetId] = scoreImage(asset.image, asset.metadata);
    }
    const score = scoreCache[asset.assetId];

    if (score.total > bestScore) {
      best = asset;
      bestScore = score.total;
    } else if (score.total === bestScore) {
      // Ticket 11: Tie Breaker
      if (asset.assetId < best.assetId) {
        best = asset;
      }
    }
  }

  // Ticket 10: Debug Logging
  console.log({
    seed: cluster.seed.assetId,
    best: best.assetId,
    bestScore: bestScore
  });

  return best;
}
