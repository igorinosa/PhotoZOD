/**
 * Visual Fingerprinting (Perceptual Hash)
 * 
 * This module provides utilities to generate a visual hash of an image.
 * Visually similar images (e.g. edited versions) will have similar hashes.
 */

import { NormalizedImageBuffer } from './normalization';

/**
 * Generates a perceptual hash (dHash) for an image.
 * 
 * Algorithm:
 * 1. Downsample NormalizedImageBuffer to 17x16 (272 pixels)
 * 2. Compare adjacent pixels (left > right) -> 256 bits (16x16)
 * 3. Convert bits to hex string
 */
export async function generateVisualHash(normalized: NormalizedImageBuffer): Promise<string> {
  // 1. Downsample to 17x16
  // Since the buffer is already normalized (32x32), we downsample to 17x16
  const targetW = 17;
  const targetH = 16;
  const downsampled = new Uint8Array(targetW * targetH);
  
  const scaleX = normalized.width / targetW;
  const scaleY = normalized.height / targetH;
  
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      // Simple point sampling for the hash grid
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      downsampled[y * targetW + x] = normalized.data[srcY * normalized.width + srcX];
    }
  }

  // 2. Compare adjacent pixels (Difference Hash)
  let hash = '';
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const left = downsampled[row * 17 + col];
      const right = downsampled[row * 17 + col + 1];
      hash += left > right ? '1' : '0';
    }
  }

  // 3. Convert 256 bits to 64 hex characters
  let hexHash = '';
  for (let i = 0; i < 256; i += 4) {
    const nibble = hash.substring(i, i + 4);
    hexHash += parseInt(nibble, 2).toString(16);
  }

  return hexHash;
}

/**
 * Calculates the Hamming Distance between two hex hashes.
 * Returns the number of differing bits.
 */
export function calculateHammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return Infinity;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;

    // Count set bits in XOR result
    while (xor > 0) {
      if (xor & 1) distance++;
      xor >>= 1;
    }
  }

  return distance;
}

/**
 * Threshold for similarity.
 * Hamming distance 64 allows for ~25% difference at 256-bit resolution.
 * This is an extremely lenient threshold that should catch almost any 
 * variation of the same photo, including different crops or heavy editing.
 */
export const VISUAL_SIMILARITY_THRESHOLD = 64;

export function isVisuallySimilar(hash1: string, hash2: string, threshold = VISUAL_SIMILARITY_THRESHOLD): boolean {
  return calculateHammingDistance(hash1, hash2) <= threshold;
}
