import { create } from 'zustand';

export type MatchThreshold = 'strict' | 'balanced' | 'loose';

interface FaceSettingsState {
  matchThreshold: MatchThreshold;
  thresholdValue: number; // 0 to 1
  dismissedMerges: string[]; // "personIdA_personIdB"
  setMatchThreshold: (threshold: MatchThreshold) => void;
  setThresholdValue: (value: number) => void;
  dismissMerge: (idA: string, idB: string) => void;
  resetDismissedMerges: () => void;
}

export const useFaceSettings = create<FaceSettingsState>((set) => ({
  matchThreshold: 'balanced',
  thresholdValue: 0.6,
  dismissedMerges: [],
  setMatchThreshold: (threshold) => {
    let value = 0.6;
    if (threshold === 'strict') value = 0.75;
    if (threshold === 'loose') value = 0.45;
    set({ matchThreshold: threshold, thresholdValue: value });
  },
  setThresholdValue: (value) => set({ thresholdValue: value }),
  dismissMerge: (idA, idB) => {
    const key = [idA, idB].sort().join('_');
    set((state) => ({
      dismissedMerges: Array.from(new Set([...state.dismissedMerges, key]))
    }));
  },
  resetDismissedMerges: () => set({ dismissedMerges: [] })
}));
