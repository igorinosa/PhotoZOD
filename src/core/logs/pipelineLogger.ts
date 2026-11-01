// Simple in-memory logger for the pipeline
// In a real desktop app, this would write to a file system.

export class PipelineLogger {
  private logs: string[] = [];
  private maxLogs = 1000;

  log(assetId: string, message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [Asset ${assetId}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  error(assetId: string, message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [Asset ${assetId}] ERROR: ${message} ${error ? String(error) : ''}`;
    console.error(logEntry);
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const pipelineLogger = new PipelineLogger();
