import { NormalizedImage } from "./multiHash";
import { resizeTo } from "./utils/resize";
import { toGrayscale } from "./utils/grayscale";

// Simplified pHash using DCT
export function computePHash(image: NormalizedImage): string {
  const resized = resizeTo(image, 32);
  const gray = toGrayscale(resized);

  // Apply DCT (simplified) - only compute top 8x8
  const top8x8 = applyDCT8x8(gray.data, 32);

  // Compute average (excluding the DC component at 0,0)
  let sum = 0;
  for (let i = 1; i < 64; i++) {
    sum += top8x8[i];
  }
  const avg = sum / 63;

  // Compare each value to average
  let bits = "";
  for (let i = 0; i < 64; i++) {
    bits += top8x8[i] > avg ? "1" : "0";
  }
  return bits;
}

function applyDCT8x8(data: Uint8ClampedArray, size: number): number[] {
  const dct = new Array(64).fill(0);
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          sum += data[i * size + j] * 
                 Math.cos(((2 * i + 1) * u * Math.PI) / (2 * size)) * 
                 Math.cos(((2 * j + 1) * v * Math.PI) / (2 * size));
        }
      }
      dct[u * 8 + v] = sum;
    }
  }
  return dct;
}
