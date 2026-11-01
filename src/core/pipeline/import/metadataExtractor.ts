import { metadataExtractor as exifExtractor, ImageMetadata } from '../../engines/metadata/exif';

export function extractMetadata(file: File): Promise<ImageMetadata> {
  // Use existing metadata extractor
  return exifExtractor.extract(file);
}
