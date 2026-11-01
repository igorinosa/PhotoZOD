import { create } from 'zustand';
import { FilterPreset } from '../../../core/presets/filterPresets';
import { getAllPresets, savePreset, updatePreset, deletePreset } from '../../../core/presets/presetEngine';

interface PresetState {
  presets: FilterPreset[];
  activePresetId: string | null;
  loadPresets: () => void;
  addPreset: (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editPreset: (id: string, updates: Partial<FilterPreset>) => void;
  removePreset: (id: string) => void;
  setActivePresetId: (id: string | null) => void;
}

export const usePresetStore = create<PresetState>((set) => ({
  presets: getAllPresets(),
  activePresetId: null,
  loadPresets: () => set({ presets: getAllPresets() }),
  addPreset: (presetData) => {
    const newPreset: FilterPreset = {
      ...presetData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    savePreset(newPreset);
    set({ presets: getAllPresets(), activePresetId: newPreset.id });
  },
  editPreset: (id, updates) => {
    updatePreset(id, updates);
    set({ presets: getAllPresets() });
  },
  removePreset: (id) => {
    deletePreset(id);
    set((state) => ({ 
      presets: getAllPresets(),
      activePresetId: state.activePresetId === id ? null : state.activePresetId
    }));
  },
  setActivePresetId: (id) => set({ activePresetId: id }),
}));
