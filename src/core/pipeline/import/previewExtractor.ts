import { routeFile } from './fileRouter';
import { libraw } from '../../engines/image/libraw';
import { vipsEngine } from '../../engines/image/vips';

export class PreviewExtractor {
  async extractPreview(file: File): Promise<Blob | null> {
    const route = await routeFile(file);

    try {
      if (route.decoder === 'libraw') {
        const result = await libraw.decodeRAW(file);
        if (result.embeddedPreview) {
          return result.embeddedPreview;
        }
        // Fallback to full decode if no preview (mocked in libraw for now)
      }

      if (route.decoder === 'vips') {
        const buffer = await file.arrayBuffer();
        const image = await vipsEngine.load(buffer);
        const resized = await vipsEngine.resize(image, 1920, 1080);
        const jpegBuffer = await vipsEngine.convertFormat(resized, 'jpeg');
        return new Blob([jpegBuffer], { type: 'image/jpeg' });
      }

      // Browser fallback (JPEG/PNG)
      return file;
    } catch (error) {
      console.error(`[PreviewExtractor] Failed to extract preview for ${file.name}:`, error);
      return null;
    }
  }
}

export const previewExtractor = new PreviewExtractor();
