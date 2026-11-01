import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { importState } from '../../pipeline/import/importState';

export type ImportJob = {
  id: string;
  files: File[];
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'duplicate' | 'ingesting';
  progress: number; // 0–100
  processedCount: number;
  totalCount: number;
  errors: string[];
  createdAt: number;
  
  duplicateOf?: string;
  requiresDecision?: boolean;
  decision?: "keep" | "skip" | "replace";
  
  errorType?: string;
  
  progressDetail?: {
    stage: "checksum" | "write" | "process";
    percent: number;
  };

  summary: {
    completed: number;
    skipped: number;
    duplicates: number;
    failed: number;
  };
};

interface ImportQueueState {
  jobs: ImportJob[];
  activeJobId: string | null;
  createJob: (files: File[]) => string;
  startJob: (jobId: string) => void;
  pauseJob: (jobId: string) => void;
  resumeJob: (jobId: string) => void;
  cancelJob: (jobId: string) => void;
  updateProgress: (jobId: string, processedCount: number, totalCount: number) => void;
  completeJob: (jobId: string) => void;
  failJob: (jobId: string, error: string) => void;
  updateJob: (jobId: string, updates: Partial<ImportJob>) => void;
  retryJob: (jobId: string) => void;
}

const MAX_QUEUE_SIZE = 10000;

export const useImportQueue = create<ImportQueueState>()(
  persist(
    (set, get) => ({
      jobs: [],
      activeJobId: null,

      createJob: (files: File[]) => {
        const currentQueueSize = get().jobs.reduce((acc, job) => acc + (job.status === 'pending' || job.status === 'processing' ? job.totalCount : 0), 0);
        if (files.length + currentQueueSize > MAX_QUEUE_SIZE) {
          throw new Error("Import limit exceeded");
        }

        const id = crypto.randomUUID();
        const newJob: ImportJob = {
          id,
          files,
          status: 'pending',
          progress: 0,
          processedCount: 0,
          totalCount: files.length,
          errors: [],
          createdAt: Date.now(),
          summary: { completed: 0, skipped: 0, duplicates: 0, failed: 0 }
        };

        importState.total += files.length;
        importState.notify();

        set((state) => ({
          jobs: [...state.jobs, newJob],
          // Auto-start if no active job
          activeJobId: state.activeJobId ? state.activeJobId : id,
        }));

        if (!get().activeJobId || get().activeJobId === id) {
          get().startJob(id);
        }

        return id;
      },

      startJob: (jobId: string) => {
        set((state) => ({
          activeJobId: jobId,
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, status: 'processing' } : job
          ),
        }));
      },

      pauseJob: (jobId: string) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, status: 'paused' } : job
          ),
        }));
      },

      resumeJob: (jobId: string) => {
        set((state) => ({
          activeJobId: jobId,
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, status: 'processing' } : job
          ),
        }));
      },

      cancelJob: (jobId: string) => {
        const job = get().jobs.find(j => j.id === jobId);
        if (job && job.status !== 'cancelled' && job.status !== 'completed') {
          importState.total -= (job.totalCount - job.processedCount);
          importState.notify();
        }

        set((state) => {
          const nextJob = state.jobs.find(j => j.id !== jobId && j.status === 'pending');
          return {
            activeJobId: state.activeJobId === jobId ? (nextJob ? nextJob.id : null) : state.activeJobId,
            jobs: state.jobs.map((job) =>
              job.id === jobId ? { ...job, status: 'cancelled' } : job
            ),
          };
        });
        
        const nextJobId = get().activeJobId;
        if (nextJobId) {
          get().startJob(nextJobId);
        }
      },

      updateProgress: (jobId: string, processedCount: number, totalCount: number) => {
        const progress = Math.round((processedCount / totalCount) * 100);
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, processedCount, totalCount, progress }
              : job
          ),
        }));
      },

      completeJob: (jobId: string) => {
        set((state) => {
          const nextJob = state.jobs.find(j => j.id !== jobId && j.status === 'pending');
          return {
            activeJobId: nextJob ? nextJob.id : null,
            jobs: state.jobs.map((job) =>
              job.id === jobId ? { ...job, status: 'completed', progress: 100 } : job
            ),
          };
        });
        
        const nextJobId = get().activeJobId;
        if (nextJobId) {
          get().startJob(nextJobId);
        }
      },

      failJob: (jobId: string, error: string) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, errors: [...job.errors, error] }
              : job
          ),
        }));
      },

      updateJob: (jobId: string, updates: Partial<ImportJob>) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, ...updates } : job
          ),
        }));
      },

      retryJob: (jobId: string) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, status: 'pending', errorType: undefined, errors: [] } : job
          ),
        }));
        
        const currentActive = get().activeJobId;
        if (!currentActive) {
          get().startJob(jobId);
        }
      }
    }),
    {
      name: 'import-queue-storage',
      partialize: (state) => ({
        // We can't persist File objects in localStorage easily, 
        // so we exclude them or handle them differently in a real app.
        // For now, we persist the job metadata.
        jobs: state.jobs.map(job => ({ ...job, files: [] })),
        activeJobId: state.activeJobId,
      }),
    }
  )
);
