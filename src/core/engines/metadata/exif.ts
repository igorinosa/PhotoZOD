import exifr from 'exifr';

export interface ImageMetadata {
  camera: string;
  lens: string;
  iso: number;
  aperture: number;
  shutterSpeed: string;
  focalLength: number;
  orientation: number;
  dateTaken: string;
  width: number;
  height: number;
  
  // 🧩 PART 7G.1.5 — APPLY SHIFT LOGIC
  captureTime: number; // Canonical field (ms)
  originalCaptureTime: number; // Non-destructive source

  // 🧩 PART 7G.2.3 — COPYRIGHT INJECTION
  exif?: {
    Artist?: string;
    Copyright?: string;
    [key: string]: any;
  };
  iptc?: {
    Byline?: string;
    CopyrightNotice?: string;
    [key: string]: any;
  };
  xmp?: {
    "dc:creator"?: string;
    "dc:rights"?: string;
    "dc:creatorContactInfo"?: {
      email?: string;
      url?: string;
    };
    [key: string]: any;
  };
}

export class MetadataExtractor {
  async extract(file: File): Promise<ImageMetadata> {
    try {
      const metadata = await exifr.parse(file, { tiff: true, ifd0: true, exif: true } as any);
      
      // Format shutter speed
      let shutterSpeed = 'Unknown';
      if (metadata?.ExposureTime) {
        if (metadata.ExposureTime >= 1) {
          shutterSpeed = metadata.ExposureTime.toString();
        } else {
          shutterSpeed = `1/${Math.round(1 / metadata.ExposureTime)}`;
        }
      }

      const dateTaken = metadata?.DateTimeOriginal?.toISOString() || new Date().toISOString();
      const captureTime = new Date(dateTaken).getTime();

      return {
        camera: metadata?.Model || 'Unknown Camera',
        lens: metadata?.LensModel || 'Unknown Lens',
        iso: metadata?.ISO || 0,
        aperture: metadata?.FNumber || 0,
        shutterSpeed,
        focalLength: metadata?.FocalLength || 0,
        orientation: metadata?.Orientation || 1,
        dateTaken,
        width: metadata?.ImageWidth || metadata?.ExifImageWidth || 0,
        height: metadata?.ImageHeight || metadata?.ExifImageHeight || 0,
        captureTime,
        originalCaptureTime: captureTime,
      };
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
      const now = new Date();
      const captureTime = now.getTime();
      // Return default metadata if extraction fails
      return {
        camera: 'Unknown',
        lens: 'Unknown',
        iso: 0,
        aperture: 0,
        shutterSpeed: 'Unknown',
        focalLength: 0,
        orientation: 1,
        dateTaken: now.toISOString(),
        width: 0,
        height: 0,
        captureTime,
        originalCaptureTime: captureTime,
      };
    }
  }
}

export const metadataExtractor = new MetadataExtractor();
