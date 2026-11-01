import { hammingDistance } from "./distance";
import { HashDistance } from "./types";
import { ImageHashes } from "./multiHash";

export function computeHashDistance(a: ImageHashes, b: ImageHashes): HashDistance {
  return {
    phash: hammingDistance(a.phash, b.phash),
    dhash: hammingDistance(a.dhash, b.dhash),
    whash: hammingDistance(a.whash, b.whash)
  };
}

export function isDuplicate(distance: HashDistance): boolean {
  // Tighten thresholds for 64-bit hashes. 
  // 12 bits out of 64 is ~18% difference, which is a standard threshold for visual similarity.
  const phashMatch = distance.phash <= 12;
  const dhashMatch = distance.dhash <= 12;
  const whashMatch = distance.whash <= 12;

  // Require at least two hashes to agree for a robust match,
  // OR one hash to be an extremely strong match (e.g., <= 4 bits difference).
  const matches = (phashMatch ? 1 : 0) + (dhashMatch ? 1 : 0) + (whashMatch ? 1 : 0);
  const veryStrongMatch = distance.phash <= 4 || distance.dhash <= 4 || distance.whash <= 4;

  return matches >= 2 || veryStrongMatch;
}

export function computeConfidence(distance: HashDistance): number {
  const total =
    distance.phash +
    distance.dhash +
    distance.whash

  const max = 64 * 3

  return 1 - total / max
}

export function compareImages(a: { hashes?: ImageHashes }, b: { hashes?: ImageHashes }) {
  if (!a.hashes || !b.hashes) {
    return {
      distance: { phash: 64, dhash: 64, whash: 64 },
      isDuplicate: false,
      confidence: 0
    }
  }
  
  if (a.hashes.sha256 && b.hashes.sha256 && a.hashes.sha256 === b.hashes.sha256) {
    return {
      distance: { phash: 0, dhash: 0, whash: 0 },
      isDuplicate: true,
      confidence: 1
    }
  }
  
  if (a.hashes.phash === "" || b.hashes.phash === "") {
    return {
      distance: { phash: 64, dhash: 64, whash: 64 },
      isDuplicate: false,
      confidence: 0
    }
  }
  
  if (a.hashes.phash.length !== b.hashes.phash.length) throw Error("Invalid hash")

  const distance = computeHashDistance(a.hashes, b.hashes)
  const isDuplicateResult = isDuplicate(distance)
  const confidence = computeConfidence(distance)

  console.log('[Comparison]', {
    phash: distance.phash,
    dhash: distance.dhash,
    whash: distance.whash,
    isDuplicate: isDuplicateResult,
    confidence
  });

  return {
    distance,
    isDuplicate: isDuplicateResult,
    confidence: confidence
  }
}
