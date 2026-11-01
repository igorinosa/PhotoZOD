import { FilterPreset } from './filterPresets';

const PRESETS_STORAGE_KEY = 'dam_filter_presets';

export function getAllPresets(): FilterPreset[] {
  try {
    const data = localStorage.getItem(PRESETS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load presets', e);
    return [];
  }
}

export function savePreset(preset: FilterPreset): void {
  const presets = getAllPresets();
  presets.push(preset);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

export function updatePreset(id: string, updates: Partial<FilterPreset>): void {
  const presets = getAllPresets();
  const index = presets.findIndex(p => p.id === id);
  if (index !== -1) {
    presets[index] = { ...presets[index], ...updates, updatedAt: Date.now() };
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }
}

export function deletePreset(id: string): void {
  const presets = getAllPresets();
  const filtered = presets.filter(p => p.id !== id);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
}
