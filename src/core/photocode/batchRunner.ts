import { Operation } from './compiler';
import { executor } from './executor';
import { ImageMetadata } from '../engines/metadata/exif';
import { safeExecute } from '../runtime/safeExecutor';

export interface BatchResult {
  success: boolean;
  buffer?: Float32Array;
  error?: boolean;
  message?: string;
  imageId: string;
}

export class BatchRunner {
  async runBatch(
    operations: Operation[],
    images: { buffer: Float32Array, metadata: ImageMetadata, id: string }[]
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    
    for (const img of images) {
      const result = await safeExecute(
        () => executor.execute(operations, img.buffer, img.metadata, img.id),
        { imageId: img.id, operations }
      );
      
      if (result.success && result.data) {
        results.push({
          success: true,
          buffer: result.data,
          imageId: img.id
        });
      } else {
        results.push({
          success: false,
          error: true,
          message: result.message,
          imageId: img.id
        });
      }
    }
    
    return results;
  }
}

export const batchRunner = new BatchRunner();
