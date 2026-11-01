import 'fake-indexeddb/auto';

(global as any).window = {
  requestIdleCallback: (cb: any) => setTimeout(cb, 0),
  cancelIdleCallback: (id: any) => clearTimeout(id),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};

import { bootloader } from './src/core/storage/bootloader';

async function main() {
  await bootloader.boot();
}

main().catch(console.error);
