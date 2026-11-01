export interface StorageAnalysis {
  totalSize: number;
  byFormat: Record<string, number>;
  byDate: Record<string, number>;
  byFolder: Record<string, number>;
  byCulling: {
    picked: number;
    rejected: number;
    unflagged: number;
  };
}

export interface BackupStatus {
  local: boolean;
  external: boolean;
  cloud: boolean;
}

export type BackupDestination = 'external' | 'cloud';

export interface BackupProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  isComplete: boolean;
  isPaused: boolean;
  isTimedOut?: boolean;
  startedAt?: number;
  speed?: number; // files per second
  eta?: number; // seconds
}

export type BackupState = 'NOT_BACKED_UP' | 'PARTIAL' | 'FULLY_BACKED_UP';
