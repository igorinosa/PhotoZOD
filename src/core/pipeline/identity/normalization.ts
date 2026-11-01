/**
 * Stage 0C: Asset Normalization Pipeline
 * 
 * Normalizes images into a standard visual format before perceptual hashing.
 * This ensures that resolution, rotation, color, and noise do not break identity.
 */

export interface NormalizedImageBuffer {
  data: Uint8Array; // Grayscale pixels
  width: number;
  height: number;
}

/**
 * Normalizes an image blob into a standard 32x32 grayscale buffer.
 * 
 * Pipeline (Strict Order):
 * 1. Decode image (handled by Image() load)
 * 2. Fix orientation (assumed already fixed by orientationFixer in importManager)
 * 3. Resize (32x32, center crop)
 * 4. Grayscale conversion
 * 5. Brightness normalization
 * 6. Contrast normalization
 * 7. Gaussian blur
 */
export async function normalizeImage(imageBlob: Blob): Promise<NormalizedImageBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // 3. Resize (32x32, center crop)
      // We use a fixed size for normalization to ensure deterministic hashing
      const targetSize = 32;
      canvas.width = targetSize;
      canvas.height = targetSize;

      // Calculate center crop to maintain aspect ratio integrity for the hash
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      // Draw center-cropped and resized image
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

      // 4. Grayscale conversion (Luminance only)
      const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
      const pixels = imageData.data;
      const grayscale = new Float32Array(targetSize * targetSize);

      for (let i = 0; i < grayscale.length; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        // Standard luminance formula: 0.299R + 0.587G + 0.114B
        grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      }

      // 5. Brightness normalization
      // Adjust average pixel value to a fixed midpoint (128)
      let sum = 0;
      for (let i = 0; i < grayscale.length; i++) sum += grayscale[i];
      const avg = sum / grayscale.length;
      const brightnessShift = 128 - avg;
      for (let i = 0; i < grayscale.length; i++) {
        grayscale[i] = Math.max(0, Math.min(255, grayscale[i] + brightnessShift));
      }

      // 6. Contrast normalization
      // Stretch histogram to a fixed range (0-255)
      let min = 255;
      let max = 0;
      for (let i = 0; i < grayscale.length; i++) {
        if (grayscale[i] < min) min = grayscale[i];
        if (grayscale[i] > max) max = grayscale[i];
      }
      
      const range = max - min;
      if (range > 0) {
        for (let i = 0; i < grayscale.length; i++) {
          grayscale[i] = ((grayscale[i] - min) / range) * 255;
        }
      }

      // 7. Gaussian blur (Simple 3x3 box blur as approximation for noise reduction)
      // This reduces the impact of high-frequency noise and compression artifacts
      const blurred = new Uint8Array(targetSize * targetSize);
      for (let y = 0; y < targetSize; y++) {
        for (let x = 0; x < targetSize; x++) {
          let bSum = 0;
          let count = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const nx = x + kx;
              const ny = y + ky;
              if (nx >= 0 && nx < targetSize && ny >= 0 && ny < targetSize) {
                bSum += grayscale[ny * targetSize + nx];
                count++;
              }
            }
          }
          blurred[y * targetSize + x] = Math.round(bSum / count);
        }
      }

      // Cleanup
      URL.revokeObjectURL(img.src);
      
      resolve({
        data: blurred,
        width: targetSize,
        height: targetSize
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for normalization'));
    };

    img.src = URL.createObjectURL(imageBlob);
  });
}
