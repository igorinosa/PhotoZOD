import 'fake-indexeddb/auto';
import { runAcceptanceTest } from './src/core/collections/acceptanceTest.ts';
import { assetStore, ensureAssetShape } from './src/core/dam/assetStore.ts';
import { initIndexManager } from './src/core/collections/indexManager.ts';

// Mock window for OPFS and other browser APIs
if (typeof window === 'undefined') {
  (global as any).window = {
    navigator: {
      storage: {
        getDirectory: async () => ({})
      }
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
}

const mockAssets = [
  ensureAssetShape({ assetId: '1', rating: 5, colorTag: 'red', ai: { tags: ['wedding'] } } as any),
  ensureAssetShape({ assetId: '2', rating: 0, colorTag: null, ai: { tags: [] } } as any),
  ensureAssetShape({ assetId: '3', rating: null, colorTag: 'none', ai: { tags: ['nature'] } } as any),
  ensureAssetShape({ assetId: '4', rating: 3, colorTag: '', ai: { tags: [] } } as any),
];

mockAssets.forEach(a => assetStore.add(a));
initIndexManager(mockAssets);

runAcceptanceTest().then(() => {
  console.log('Done');
}).catch(console.error);
