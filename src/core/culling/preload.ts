import { cullingSession } from './cullingSession';
import { loadAssetUIData } from '../dam/assetUrlCache';

export function getNextN(n: number): string[] {
  const allIds = cullingSession.getAll();
  const currentIndex = cullingSession.currentIndex();
  return allIds.slice(currentIndex + 1, currentIndex + 1 + n);
}

export function preloadNext() {
  const nextIds = getNextN(5);

  nextIds.forEach(id => {
    loadAssetUIData(id).then(data => {
      if (data && data.previewUrl) {
        // Preload image by creating a new Image object
        const img = new Image();
        img.src = data.previewUrl;
      }
    });
  });
}
