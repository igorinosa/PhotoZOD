export type WorkerTask = {
  id: string;
  type: string;
  payload: any;
};

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<Worker, string> = new Map();
  private pendingPromises: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private workerScriptUrl: string;

  constructor(size: number = navigator.hardwareConcurrency || 4) {
    // Create a blob URL for the worker script to avoid needing a separate file during dev
    const workerCode = `
      self.onmessage = async (e) => {
        const { id, type, payload } = e.data;
        try {
          let result;
          if (type === 'test') {
            // Simulate heavy work
            let sum = 0;
            for(let i=0; i<10000000; i++) sum += i;
            result = { message: 'Task processed successfully', sum, payload };
          } else {
            result = { error: 'Unknown task type' };
          }
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.workerScriptUrl = URL.createObjectURL(blob);

    for (let i = 0; i < size; i++) {
      this.addWorker();
    }
  }

  private addWorker() {
    const worker = new Worker(this.workerScriptUrl);
    worker.onmessage = (e) => this.handleWorkerMessage(worker, e.data);
    worker.onerror = (e) => this.handleWorkerError(worker, e);
    this.workers.push(worker);
  }

  private handleWorkerMessage(worker: Worker, data: any) {
    const { id, result, error } = data;
    this.activeTasks.delete(worker);
    
    const promiseHandlers = this.pendingPromises.get(id);
    if (promiseHandlers) {
      if (error) promiseHandlers.reject(new Error(error));
      else promiseHandlers.resolve(result);
      this.pendingPromises.delete(id);
    }

    this.processNextTask();
  }

  private handleWorkerError(worker: Worker, error: ErrorEvent) {
    console.error('Worker error:', error);
    this.activeTasks.delete(worker);
    this.processNextTask();
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(w => !this.activeTasks.has(w));
    if (availableWorker) {
      const task = this.taskQueue.shift()!;
      this.activeTasks.set(availableWorker, task.id);
      availableWorker.postMessage(task);
    }
  }

  private taskCounter = 0;

  async executeTask(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const task: WorkerTask = {
        id: `task_${now}_${this.taskCounter++}`,
        type,
        payload
      };
      this.pendingPromises.set(task.id, { resolve, reject });
      this.taskQueue.push(task);
      this.processNextTask();
    });
  }
}

export const workerPool = new WorkerPool();
