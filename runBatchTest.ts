import 'fake-indexeddb/auto';

(global as any).window = {
  requestIdleCallback: (cb: any) => setTimeout(cb, 0),
  cancelIdleCallback: (id: any) => clearTimeout(id),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};

import { runBatchValidationTests } from './src/core/versioning/batchValidationTest';

async function main() {
  await runBatchValidationTests();
}

main().catch(console.error);
