import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Preset {
  id: string;
  name: string;
  code: string;
  createdAt: number;
}

interface PresetStore {
  presets: Preset[];
  addPreset: (name: string, code: string) => void;
  removePreset: (id: string) => void;
  updatePreset: (id: string, name: string, code: string) => void;
}

export const usePresetStore = create<PresetStore>()(
  persist(
    (set) => ({
      presets: [],
      addPreset: (name, code) => set((state) => ({
        presets: [
          ...state.presets,
          {
            id: crypto.randomUUID(),
            name,
            code,
            createdAt: Date.now(),
          }
        ]
      })),
      removePreset: (id) => set((state) => ({
        presets: state.presets.filter((p) => p.id !== id)
      })),
      updatePreset: (id, name, code) => set((state) => ({
        presets: state.presets.map((p) => 
          p.id === id ? { ...p, name, code } : p
        )
      }))
    }),
    {
      name: 'photozod-presets',
    }
  )
);
