import { NormalizedImage } from "./multiHash";
import { resizeTo } from "./utils/resize";
import { toGrayscale } from "./utils/grayscale";

// Simplified WHash
export function computeWHash(image: NormalizedImage): string {
  const resized = resizeTo(image, 32);
  const gray = toGrayscale(resized);

  // Simplified wavelet: just use a different sampling window (as allowed by the prompt)
  // Reuse pHash structure but with different sampling window
  
  const top8x8 = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      // Sample from a different part of the image
      top8x8.push(gray.data[(y + 16) * 32 + (x + 16)]);
    }
  }

  const avg = top8x8.reduce((a, b) => a + b, 0) / top8x8.length;

  return top8x8.map(val => (val > avg ? "1" : "0")).join("");
}
