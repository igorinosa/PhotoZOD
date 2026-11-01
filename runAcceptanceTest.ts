import 'fake-indexeddb/auto';

(global as any).window = {
  requestIdleCallback: (cb: any) => setTimeout(cb, 0),
  cancelIdleCallback: (id: any) => clearTimeout(id),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};

import { runAcceptanceTest } from './src/core/collections/acceptanceTest';

async function main() {
  await runAcceptanceTest();
}

main().catch(console.error);
