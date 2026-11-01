import { create } from 'zustand';
import { assetStore } from '../dam/assetStore';
import { runAI } from '../ai/vision/semanticBuilder';
import { ImportedAsset } from '../../shared/types';
import { runInitialClustering } from './faceEntityEngine';

export type ProcessingStatus = 'idle' | 'running' | 'paused' | 'completed';

interface FaceProcessorState {
  status: ProcessingStatus;
  progress: number; // 0 to 1
  total: number;
  current: number;
  highPriorityQueue: string[];
  lowPriorityQueue: string[];
  
  startProcessing: (assetIds?: string[]) => Promise<void>;
  prioritizeAssets: (assetIds: string[]) => void;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  stopProcessing: () => void;
  reprocessAll: () => Promise<void>;
}

let idleCallbackId: number | null = null;
let timeoutId: any = null;

export const useFaceProcessor = create<FaceProcessorState>((set, get) => {
  const processNext = async (deadline?: IdleDeadline) => {
    const { status, highPriorityQueue, lowPriorityQueue, current, total } = get();
    
    if (status !== 'running') return;
    
    if (highPriorityQueue.length === 0 && lowPriorityQueue.length === 0) {
      // Run clustering BEFORE setting completed status to ensure UI sees the results
      set({ progress: 1 });
      try {
        await runInitialClustering();
      } catch (e) {
        console.error('[FaceProcessor] Clustering failed', e);
      }
      set({ status: 'completed' });
      return;
    }

    // Process high priority first, ignoring idle deadline
    let idsToProcess: string[] = [];
    let isHighPriority = false;

    // Batch size: 50-100. We'll use 50.
    const BATCH_SIZE = 50;

    if (highPriorityQueue.length > 0) {
      idsToProcess = highPriorityQueue.slice(0, BATCH_SIZE);
      set({ highPriorityQueue: highPriorityQueue.slice(idsToProcess.length) });
      isHighPriority = true;
    } else if (lowPriorityQueue.length > 0) {
      // Only process low priority if we have idle time or no deadline provided
      if (!deadline || deadline.timeRemaining() > 5) {
        idsToProcess = lowPriorityQueue.slice(0, BATCH_SIZE);
        set({ lowPriorityQueue: lowPriorityQueue.slice(idsToProcess.length) });
      }
    }

    if (idsToProcess.length > 0) {
      const startTime = performance.now();
      
      for (const idToProcess of idsToProcess) {
        if (get().status !== 'running') break; // Allow early exit if paused
        
        const asset = assetStore.get(idToProcess) as ImportedAsset | undefined;
        if (asset) {
          try {
            await runAI(asset);
          } catch (e) {
            console.error(`[FaceProcessor] Error processing ${idToProcess}`, e);
          }
        }
        
        const newCurrent = get().current + 1;
        set({ current: newCurrent, progress: total > 0 ? newCurrent / total : 1 });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Pause if performance drops (e.g., took more than 5 seconds for a batch)
      if (duration > 5000 && !isHighPriority) {
        console.warn(`[FaceProcessor] Performance drop detected (${duration}ms for batch). Pausing.`);
        set({ status: 'paused' });
        return;
      }
    }

    // Schedule next
    if (get().status === 'running') {
      if (get().highPriorityQueue.length > 0) {
        // High priority: schedule immediately
        timeoutId = setTimeout(() => processNext(), 0);
      } else if (get().lowPriorityQueue.length > 0) {
        // Low priority: schedule in idle time
        if ('requestIdleCallback' in window) {
          idleCallbackId = window.requestIdleCallback((dl) => processNext(dl));
        } else {
          timeoutId = setTimeout(() => processNext(), 50);
        }
      } else {
        set({ progress: 1 });
        try {
          await runInitialClustering();
        } catch (e) {
          console.error('[FaceProcessor] Clustering failed', e);
        }
        set({ status: 'completed' });
      }
    }
  };

  return {
    status: 'idle',
    progress: 0,
    total: 0,
    current: 0,
    highPriorityQueue: [],
    lowPriorityQueue: [],

    startProcessing: async (assetIds) => {
      const ids = assetIds || assetStore.getAll().map(a => a.assetId);
      
      // Filter out already processed if not explicitly requested? 
      // For now, just process what's given.
      set({ 
        status: 'running', 
        total: ids.length, 
        current: 0, 
        progress: 0, 
        highPriorityQueue: [], 
        lowPriorityQueue: ids 
      });
      
      if (idleCallbackId) window.cancelIdleCallback(idleCallbackId);
      if (timeoutId) clearTimeout(timeoutId);
      
      processNext();
    },

    prioritizeAssets: (assetIds: string[]) => {
      const { lowPriorityQueue, highPriorityQueue } = get();
      
      // Move from low to high
      const newLow = lowPriorityQueue.filter(id => !assetIds.includes(id));
      const toMove = lowPriorityQueue.filter(id => assetIds.includes(id));
      
      // Add to high if not already there
      const newHigh = [...highPriorityQueue];
      for (const id of toMove) {
        if (!newHigh.includes(id)) newHigh.push(id);
      }
      
      set({ highPriorityQueue: newHigh, lowPriorityQueue: newLow });
      
      // If we were paused or idle, maybe we should start? 
      // Let's assume prioritize only affects running queue.
    },

    pauseProcessing: () => {
      set({ status: 'paused' });
      if (idleCallbackId) window.cancelIdleCallback(idleCallbackId);
      if (timeoutId) clearTimeout(timeoutId);
    },
    
    resumeProcessing: () => {
      set({ status: 'running' });
      processNext();
    },

    stopProcessing: () => {
      set({ status: 'idle', highPriorityQueue: [], lowPriorityQueue: [], progress: 0, current: 0 });
      if (idleCallbackId) window.cancelIdleCallback(idleCallbackId);
      if (timeoutId) clearTimeout(timeoutId);
    },

    reprocessAll: async () => {
      const all = assetStore.getAll().map(a => a.assetId);
      // Return a promise that resolves when the queue is actually empty
      return new Promise<void>((resolve) => {
        const checkCompletion = () => {
          const { status, highPriorityQueue, lowPriorityQueue } = get();
          if (status === 'idle' || (highPriorityQueue.length === 0 && lowPriorityQueue.length === 0)) {
            unsubscribe();
            resolve();
          }
        };
        const unsubscribe = useFaceProcessor.subscribe(checkCompletion);
        get().startProcessing(all);
      });
    }
  };
});
