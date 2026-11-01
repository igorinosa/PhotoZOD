import { processFile } from './importManager';
import { importState } from './importState';

const queue: File[] = [];
let runningCount = 0;
const CONCURRENCY_LIMIT = 4;

export function enqueueImport(file: File) {
  queue.push(file);
  importState.total++;
  importState.notify();
  processQueue();
}

async function processQueue() {
  while (runningCount < CONCURRENCY_LIMIT && queue.length > 0) {
    const file = queue.shift();
    if (!file) continue;

    runningCount++;
    
    // Start processing without awaiting
    processFile(file, (progress) => {
      importState.updateProgress(progress);
    }).then(asset => {
      importState.processed++;
      importState.notifyAsset(asset);
    }).catch(err => {
      console.error(`Failed to import ${file.name}:`, err);
      importState.failed++;
    }).finally(() => {
      runningCount--;
      importState.updateProgress(null);
      importState.notify();
      processQueue(); // Start next if any
    });
  }
}
