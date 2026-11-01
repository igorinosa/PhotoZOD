import { ImportedAsset } from './importManagerTypes';
import { enqueueAI } from '../../ai/queue/aiQueue';

export function triggerAI(asset: ImportedAsset) {
  // Trigger Stage 5B+ after import
  // Non-blocking background task
  setTimeout(() => {
    try {
      console.log(`[AI Trigger] Enqueued AI processing for ${asset.file.name}`);
      enqueueAI(asset);
    } catch (err) {
      console.error(`[AI Trigger] Failed for ${asset.file.name}:`, err);
    }
  }, 0);
}
