import { NormalizedImage } from "./multiHash";
import { resizeTo } from "./utils/resize";
import { toGrayscale } from "./utils/grayscale";

export function computeDHash(image: NormalizedImage): string {
  const resized = resizeTo(image, 9, 8); // 9x8
  const gray = toGrayscale(resized);

  let bits = "";

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = gray.data[y * 9 + x];
      const right = gray.data[y * 9 + x + 1];

      bits += left > right ? "1" : "0";
    }
  }

  return bits;
}
