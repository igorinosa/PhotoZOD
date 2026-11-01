import { create } from 'zustand';
import { CopyrightPayload } from '../../../core/metadata/copyrightEngine';
import { systemDB } from '../../../core/storage/db';
import { settingsManager } from '../../../core/state/settingsManager';

interface SettingsState {
  autoApplyCopyright: boolean;
  defaultCopyright: CopyrightPayload | null;
  autoDeleteAfterDays: number | null;
  
  setAutoApplyCopyright: (enabled: boolean) => void;
  setDefaultCopyright: (payload: CopyrightPayload | null) => void;
  setAutoDeleteAfterDays: (days: number | null) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  autoApplyCopyright: false,
  defaultCopyright: null,
  autoDeleteAfterDays: null,

  setAutoApplyCopyright: (enabled) => {
    set({ autoApplyCopyright: enabled });
    settingsManager.updateSettings({ autoApplyCopyright: enabled });
    systemDB.saveSystemData('settings', { 
      autoApplyCopyright: enabled,
      defaultCopyright: get().defaultCopyright,
      autoDeleteAfterDays: get().autoDeleteAfterDays
    }).catch(console.error);
  },

  setDefaultCopyright: (payload) => {
    set({ defaultCopyright: payload });
    settingsManager.updateSettings({ defaultCopyright: payload });
    systemDB.saveSystemData('settings', { 
      autoApplyCopyright: get().autoApplyCopyright,
      defaultCopyright: payload,
      autoDeleteAfterDays: get().autoDeleteAfterDays
    }).catch(console.error);
  },

  setAutoDeleteAfterDays: (days) => {
    set({ autoDeleteAfterDays: days });
    settingsManager.updateSettings({ autoDeleteAfterDays: days });
    systemDB.saveSystemData('settings', { 
      autoApplyCopyright: get().autoApplyCopyright,
      defaultCopyright: get().defaultCopyright,
      autoDeleteAfterDays: days
    }).catch(console.error);
  },

  loadSettings: async () => {
    try {
      const settings = await systemDB.getSystemData('settings');
      if (settings) {
        set({ 
          autoApplyCopyright: settings.autoApplyCopyright ?? false,
          defaultCopyright: settings.defaultCopyright ?? null,
          autoDeleteAfterDays: settings.autoDeleteAfterDays ?? null
        });
        settingsManager.updateSettings({
          autoApplyCopyright: settings.autoApplyCopyright ?? false,
          defaultCopyright: settings.defaultCopyright ?? null,
          autoDeleteAfterDays: settings.autoDeleteAfterDays ?? null
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}));
