import { BBox } from '../ai/human/schema';

export async function extractThumbnail(image: Blob, faceBox: BBox): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(image);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Add some padding around the face
      const padding = Math.max(faceBox.w, faceBox.h) * 0.2;
      
      const sx = Math.max(0, faceBox.x - padding);
      const sy = Math.max(0, faceBox.y - padding);
      const sw = Math.min(img.width - sx, faceBox.w + padding * 2);
      const sh = Math.min(img.height - sy, faceBox.h + padding * 2);
      
      // Fixed thumbnail size
      canvas.width = 128;
      canvas.height = 128;
      
      // Draw cropped face
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 128, 128);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail extraction'));
    };
    
    img.src = url;
  });
}
