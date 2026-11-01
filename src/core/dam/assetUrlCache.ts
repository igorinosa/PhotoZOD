import { previewCache } from '../cache/previewCache';
import { ImageMetadata } from '../engines/metadata/exif';

export interface AssetUIData {
  previewUrl: string;
  thumbnailUrl: string;
  metadata: ImageMetadata;
}

const uiDataCache = new Map<string, AssetUIData>();
const loadingPromises = new Map<string, Promise<AssetUIData | undefined>>();

export async function loadAssetUIData(id: string): Promise<AssetUIData | undefined> {
  if (uiDataCache.has(id)) return uiDataCache.get(id);
  if (loadingPromises.has(id)) return loadingPromises.get(id);
  
  const promise = previewCache.get(id).then(cached => {
    if (cached) {
      const data = {
        previewUrl: URL.createObjectURL(cached.mediumPreview),
        thumbnailUrl: URL.createObjectURL(cached.thumbnail),
        metadata: cached.metadata
      };
      uiDataCache.set(id, data);
      return data;
    }
    return undefined;
  });
  
  loadingPromises.set(id, promise);
  const result = await promise;
  loadingPromises.delete(id);
  return result;
}

export function getAssetUIData(id: string): AssetUIData | undefined {
  return uiDataCache.get(id);
}
