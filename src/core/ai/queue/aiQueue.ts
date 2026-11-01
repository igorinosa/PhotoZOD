import { ImportedAsset } from '../../pipeline/import/importManagerTypes';
import { runAI } from '../vision/semanticBuilder';

const queue: ImportedAsset[] = [];
let running = false;

export function enqueueAI(task: ImportedAsset) {
  queue.push(task);
  if (!running) process();
}

async function process() {
  running = true;

  while (queue.length > 0) {
    const task = queue.shift();
    if (task) {
      try {
        await runAI(task);
      } catch (err) {
        console.error(`[AI Queue] Failed to process ${task.assetId}:`, err);
      }
    }
  }

  running = false;
}
