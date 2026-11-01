import exifr from 'exifr';

export interface RawDecodeResult {
  rawBuffer: Float32Array | null; // 32-bit linear sensor data
  width: number;
  height: number;
  bayerPattern: string; // e.g., 'RGGB'
  blackLevel: number;
  whiteLevel: number;
  cameraMatrix: number[]; // 3x3 color matrix
  embeddedPreview: Blob | null; // Fast JPEG preview
}

export class LibRawEngine {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    // In a real implementation, this would load libraw.wasm
    // For this prototype, we mock the WASM initialization and use exifr for previews
    console.log('[LibRaw] Initializing WASM module...');
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate WASM load
    this.initialized = true;
  }

  async decodeRAW(file: File): Promise<RawDecodeResult> {
    if (!this.initialized) await this.init();

    console.log(`[LibRaw] Decoding ${file.name}...`);
    
    // 1. Extract embedded preview (Priority!)
    // We use exifr to parse the embedded JPEG from the RAW file
    let embeddedPreview: Blob | null = null;
    let width = 0;
    let height = 0;

    try {
      // Extract thumbnail/preview
      console.log(`[LibRaw] Attempting to extract preview for ${file.name}`);
      const previewBuffer = await exifr.thumbnail(file);
      if (previewBuffer) {
        console.log(`[LibRaw] Successfully extracted embedded preview for ${file.name}`);
        embeddedPreview = new Blob([previewBuffer], { type: 'image/jpeg' });
      } else {
        console.warn(`[LibRaw] No embedded preview found for ${file.name}`);
      }

      // Extract basic dimensions from metadata
      const metadata = await exifr.parse(file, { tiff: true, ifd0: true, exif: true } as any);
      width = metadata?.ImageWidth || metadata?.ExifImageWidth || 0;
      height = metadata?.ImageHeight || metadata?.ExifImageHeight || 0;
    } catch (err) {
      console.warn(`[LibRaw] Failed to extract preview/metadata via exifr for ${file.name}`, err);
    }

    // Return the structured result
    // In a full WASM implementation, rawBuffer would contain the 16-bit linear sensor data
    return {
      rawBuffer: null, // Deferred until full decode is needed for editing
      width,
      height,
      bayerPattern: 'RGGB', // Mocked
      blackLevel: 2048,     // Mocked
      whiteLevel: 16383,    // Mocked
      cameraMatrix: [       // Mocked sRGB matrix
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
      ],
      embeddedPreview
    };
  }
}

export const libraw = new LibRawEngine();
