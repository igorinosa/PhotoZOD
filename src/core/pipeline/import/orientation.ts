export class OrientationFixer {
  async fixOrientation(blob: Blob, orientation: number): Promise<Blob> {
    if (orientation === 1 || orientation === 0) return blob;

    console.log(`[OrientationFixer] Fixing orientation: ${orientation}`);
    
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    // Set dimensions based on orientation
    if (orientation >= 5 && orientation <= 8) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    // Apply transformation
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, img.width, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, img.width, img.height); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, img.height); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, img.height, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, img.height, img.width); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, img.width); break;
      default: break;
    }

    ctx.drawImage(img, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.9);
    });
  }
}

export const orientationFixer = new OrientationFixer();
