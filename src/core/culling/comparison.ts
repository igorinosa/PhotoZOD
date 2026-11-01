import { assetStore } from '../dam/assetStore';
import { Asset } from '../dam/types';

export function compare(ids: string[]): Asset[] {
  return ids.map(id => assetStore.get(id)).filter((a): a is Asset => a !== undefined);
}
