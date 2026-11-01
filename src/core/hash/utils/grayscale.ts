import { NormalizedImage } from "../multiHash";

export function toGrayscale(image: NormalizedImage): NormalizedImage {
  const grayData = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const r = image.data[i];
    const g = image.data[i + 1];
    const b = image.data[i + 2];
    // gray = 0.299R + 0.587G + 0.114B
    grayData[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return {
    data: grayData,
    width: image.width,
    height: image.height
  };
}
