import { entityManager } from './entityManager';
import { entityEventBus } from '../events/entityEvents';

export interface PropagationOperation {
  type: string;
  params: any;
  scope: 'entity';
  priority: number;
}

export interface QueuedOperation {
  assetId: string;
  operations: PropagationOperation[];
}

class PropagationEngine {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private readonly CHUNK_SIZE = 100;

  async propagateEntityEdit(entityId: string, operations: PropagationOperation[]): Promise<QueuedOperation[]> {
    const assets = await entityManager.getAssetsForEntity(entityId);
    
    const queuedOps = assets.map(assetId => ({
      assetId,
      operations
    }));

    this.queue.push(...queuedOps);
    
    // Start processing in background
    this.processQueue();

    return queuedOps;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const chunk = this.queue.splice(0, this.CHUNK_SIZE);
      
      // Send chunk to worker or process directly
      // For now, we simulate worker processing
      await this.processChunk(chunk);

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.isProcessing = false;
    entityEventBus.emit('ENTITY_PROPAGATED', { status: 'complete' });
  }

  private async processChunk(chunk: QueuedOperation[]) {
    // In a real implementation, this would send the chunk to a Web Worker pool
    // to execute the PhotoCode operations on the respective assets.
    for (const op of chunk) {
      try {
        // Mock execution
        // console.log(`[PropagationEngine] Processing asset ${op.assetId}`);
      } catch (e) {
        console.error(`[PropagationEngine] Error processing asset ${op.assetId}:`, e);
      }
    }
  }
}

export const propagationEngine = new PropagationEngine();
