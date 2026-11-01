import { Asset } from '../dam/types';
import { assetStore } from '../dam/assetStore';

export function getAllAssets(): Asset[] {
  return assetStore.getAll();
}
