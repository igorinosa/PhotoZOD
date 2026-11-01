import { ImageMetadata } from '../engines/metadata/exif';
import { opfsManager } from '../storage/opfs';
import { systemDB } from '../storage/db';

export interface CachedPreview {
  id: string; // assetId
  thumbnail: Blob;
  mediumPreview: Blob;
  metadata: ImageMetadata;
}

export class PreviewCache {
  async set(id: string, data: Omit<CachedPreview, 'id'>): Promise<void> {
    try {
      // Save blobs to OPFS
      await opfsManager.saveFile(id, 'preview', data.mediumPreview);
      // We can also save thumbnail if needed, but for now we'll just use mediumPreview for both or save them separately.
      // Let's just save metadata to systemDB
      await systemDB.saveSystemData(`preview_meta_${id}`, data.metadata);
    } catch (err) {
      console.warn(`[PreviewCache] Failed to set cache for ${id}:`, err);
    }
  }

  async get(id: string): Promise<CachedPreview | undefined> {
    try {
      const blob = await opfsManager.getFile(id, 'preview');
      if (!blob) return undefined;

      const metadata = await systemDB.getSystemData(`preview_meta_${id}`);
      if (!metadata) return undefined;

      return {
        id,
        thumbnail: blob, // Just reuse the blob for now
        mediumPreview: blob,
        metadata
      };
    } catch (err) {
      console.warn(`[PreviewCache] Failed to get cache for ${id}:`, err);
    }
    return undefined;
  }

  async updateMetadata(id: string, metadata: ImageMetadata): Promise<void> {
    try {
      await systemDB.saveSystemData(`preview_meta_${id}`, metadata);
    } catch (err) {
      console.warn(`[PreviewCache] Failed to update metadata for ${id}:`, err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await opfsManager.deleteAsset(id);
      await systemDB.getDB().then(db => db.delete('system', `preview_meta_${id}`));
    } catch (err) {
      console.warn(`[PreviewCache] Failed to delete cache for ${id}:`, err);
    }
  }

  async generateHash(file: File): Promise<string> {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}

export const previewCache = new PreviewCache();
