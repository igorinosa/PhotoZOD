import { ImageMetadata } from '../engines/metadata/exif';
import { previewCache } from './previewCache';
import { opfsManager } from '../storage/opfs';

export interface StoredAsset {
  originalFile: File;
  preview: Blob;
  metadata: ImageMetadata;
  hash: string;
}

export async function storeAsset(id: string, data: StoredAsset): Promise<void> {
  // Save original file to OPFS
  await opfsManager.saveFile(id, 'original', data.originalFile);

  // Use existing previewCache to store the preview and metadata
  await previewCache.set(id, {
    thumbnail: data.preview,
    mediumPreview: data.preview,
    metadata: data.metadata,
  });
}
