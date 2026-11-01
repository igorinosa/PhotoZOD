import { NormalizedImage } from "../multiHash";

export function resizeTo(
  image: NormalizedImage,
  width: number,
  height: number = width
): NormalizedImage {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = new ImageData(image.data, image.width, image.height);
  
  // Create a temporary canvas to draw the original image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Could not get temp canvas context');
  tempCtx.putImageData(imageData, 0, 0);

  // Draw and resize
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  
  const resizedImageData = ctx.getImageData(0, 0, width, height);
  return {
    data: resizedImageData.data,
    width: width,
    height: height
  };
}
