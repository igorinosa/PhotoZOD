import { assetEventBus } from '../events/assetEvents';

type Listener = () => void;
const listeners: Listener[] = [];

export function subscribe(fn: Listener) {
  listeners.push(fn);
  return () => {
    const index = listeners.indexOf(fn);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

export function notify() {
  listeners.forEach(fn => fn());
}

// Trigger points: metadata update, culling change, tagging, import
// These are all covered by the assetEventBus
assetEventBus.subscribe('ASSET_IMPORTED', () => notify());
assetEventBus.subscribe('ASSET_UPDATED', () => notify());
assetEventBus.subscribe('BATCH_UPDATED', () => notify());
assetEventBus.subscribe('ASSET_DELETED', () => notify());
