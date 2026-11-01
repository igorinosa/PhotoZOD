import { ImageMetadata } from '../engines/metadata/exif';
import { taskQueue } from './queue';

export interface WorkerRequest {
  id: string;
  type: 'RENDER';
  code: string;
  sourceBlob: Blob;
  metadata: ImageMetadata;
  imageId: string;
}

export interface WorkerResponse {
  id: string;
  type: 'RENDER_SUCCESS' | 'RENDER_ERROR';
  resultBlob?: Blob;
  error?: string;
}

export class WorkerBridge {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (blob: Blob) => void; reject: (err: Error) => void }> = new Map();
  private messageIdCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined') {
      // Create a web worker
      this.worker = new Worker(new URL('./photocode.worker.ts', import.meta.url), { type: 'module' });
      
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, type, resultBlob, error } = e.data;
        const pending = this.pendingRequests.get(id);
        
        if (pending) {
          if (type === 'RENDER_SUCCESS' && resultBlob) {
            pending.resolve(resultBlob);
          } else {
            pending.reject(new Error(error || 'Unknown worker error'));
          }
          this.pendingRequests.delete(id);
        }
      };

      this.worker.onerror = (err) => {
        console.error('Worker error:', err);
      };
    }
  }

  public async render(code: string, sourceBlob: Blob, metadata: ImageMetadata, imageId: string): Promise<Blob> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return taskQueue.enqueue(async () => {
      const id = `req_${this.messageIdCounter++}`;
      
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });
        
        const request: WorkerRequest = {
          id,
          type: 'RENDER',
          code,
          sourceBlob,
          metadata,
          imageId
        };
        
        this.worker!.postMessage(request);
      });
    });
  }
}

export const workerBridge = new WorkerBridge();
