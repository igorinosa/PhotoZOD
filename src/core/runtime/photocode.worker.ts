import { renderPipeline } from '../pipeline/render/renderPipeline';
import { WorkerRequest, WorkerResponse } from './workerBridge';

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, type, code, sourceBlob, metadata, imageId } = e.data;

  if (type === 'RENDER') {
    try {
      const resultBlob = await renderPipeline.render(code, sourceBlob, metadata, imageId);
      
      const response: WorkerResponse = {
        id,
        type: 'RENDER_SUCCESS',
        resultBlob
      };
      
      // Send the result back to the main thread
      self.postMessage(response);
    } catch (error) {
      console.error('Worker failed to render:', error);
      const response: WorkerResponse = {
        id,
        type: 'RENDER_ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
      self.postMessage(response);
    }
  }
};
