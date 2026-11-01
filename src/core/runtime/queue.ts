type Task<T> = () => Promise<T>;

interface QueueItem<T> {
  task: Task<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

class TaskQueue {
  private queue: QueueItem<any>[] = [];
  private running = false;

  async enqueue<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      if (!this.running) {
        this.process();
      }
    });
  }

  private async process() {
    this.running = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        try {
          const result = await job.task();
          job.resolve(result);
        } catch (error) {
          job.reject(error);
        }
      }
    }

    this.running = false;
  }
  
  clear() {
    this.queue = [];
  }
}

export const taskQueue = new TaskQueue();
