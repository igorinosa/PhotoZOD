// @ts-ignore
import Vips from 'wasm-vips';

export class VipsEngine {
  private vips: any = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      // Initialize wasm-vips
      console.log('[VipsEngine] Initializing wasm-vips...');
      this.vips = await Vips();
      this.initialized = true;
      console.log('[VipsEngine] wasm-vips initialized successfully');
    } catch (error) {
      console.error('[VipsEngine] Failed to initialize wasm-vips:', error);
      // Fallback to browser APIs if wasm-vips fails
    }
  }

  async load(buffer: ArrayBuffer): Promise<any> {
    if (!this.initialized) await this.init();
    if (this.vips) {
      return this.vips.Image.newFromBuffer(buffer);
    }
    // Fallback: create a blob URL
    return new Blob([buffer]);
  }

  async resize(image: any, width: number, height: number): Promise<any> {
    if (this.vips && image instanceof this.vips.Image) {
      return image.thumbnailImage(width, { height });
    }
    // Fallback: Canvas resize
    return this.fallbackResize(image as Blob, width, height);
  }

  async convertFormat(image: any, format: 'jpeg' | 'png' | 'webp'): Promise<ArrayBuffer> {
    if (this.vips && image instanceof this.vips.Image) {
      return image.writeToBuffer(`.${format}`);
    }
    // Fallback: Canvas toBlob
    return this.fallbackConvert(image as Blob, format);
  }

  // Fallback implementations using browser APIs
  private async fallbackResize(blob: Blob, width: number, height: number): Promise<Blob> {
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b!), blob.type);
      });
    }
    return blob;
  }

  private async fallbackConvert(blob: Blob, format: string): Promise<ArrayBuffer> {
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      return new Promise((resolve) => {
        canvas.toBlob(async (b) => resolve(await b!.arrayBuffer()), `image/${format}`);
      });
    }
    return blob.arrayBuffer();
  }
}

export const vipsEngine = new VipsEngine();
