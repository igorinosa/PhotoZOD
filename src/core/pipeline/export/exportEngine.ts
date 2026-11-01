import piexif from 'piexifjs';
import { ImageMetadata } from '../../engines/metadata/exif';

export interface ExportOptions {
  format: 'jpeg' | 'png';
  quality: number;
  preserveMetadata: boolean;
}

export class ExportEngine {
  public async exportImage(
    blob: Blob, 
    metadata: ImageMetadata, 
    options: ExportOptions = { format: 'jpeg', quality: 0.9, preserveMetadata: true }
  ): Promise<Blob> {
    if (options.format !== 'jpeg' || !options.preserveMetadata) {
      return blob;
    }

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Prepare EXIF object for piexif
      const zeroth: any = {};
      const exif: any = {};
      const gps: any = {};

      if (metadata.exif?.Artist) zeroth[piexif.ImageIFD.Artist] = metadata.exif.Artist;
      if (metadata.exif?.Copyright) zeroth[piexif.ImageIFD.Copyright] = metadata.exif.Copyright;
      if (metadata.camera) zeroth[piexif.ImageIFD.Model] = metadata.camera;
      if (metadata.shutterSpeed) exif[piexif.ExifIFD.ExposureTime] = this.parseFraction(metadata.shutterSpeed);
      if (metadata.aperture) exif[piexif.ExifIFD.FNumber] = this.parseFraction(metadata.aperture);
      if (metadata.iso) exif[piexif.ExifIFD.ISOSpeedRatings] = [metadata.iso];
      if (metadata.captureTime) exif[piexif.ExifIFD.DateTimeOriginal] = this.formatExifDate(metadata.captureTime);

      const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
      const exifBytes = piexif.dump(exifObj);
      
      const newExifDataUrl = piexif.insert(exifBytes, dataUrl);
      
      // Convert back to Blob
      const byteString = atob(newExifDataUrl.split(',')[1]);
      const mimeString = newExifDataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    } catch (error) {
      console.error('[ExportEngine] Export failed:', error);
      return blob; // Fallback to original blob
    }
  }

  private parseFraction(val: any): [number, number] {
    if (typeof val === 'number') return [val * 1000, 1000];
    if (typeof val === 'string' && val.includes('/')) {
      const [n, d] = val.split('/').map(Number);
      return [n, d];
    }
    return [Number(val) * 1000, 1000];
  }

  private formatExifDate(date: any): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/-/g, ':').replace('T', ' ').split('.')[0];
  }
}

export const exportEngine = new ExportEngine();
