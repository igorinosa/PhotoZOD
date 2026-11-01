import { presetCache } from '../../cache/presetCache';

export type EntityPreset = {
  id: string;
  name: string;
  entityId?: string;
  photocode: string;
  tags: string[];
  createdAt: number;
};

class EntityPresetManager {
  constructor() {
    this.initializeDefaultPresets();
  }

  private async initializeDefaultPresets() {
    const defaults = [
      { id: 'soft_skin', name: 'Soft Skin', photocode: 'skin_smoothing: 50\nclarity: -10', tags: ['portrait', 'skin'] },
      { id: 'contrast_sharp', name: 'Contrast & Sharp', photocode: 'contrast: 20\nsharpen: 30', tags: ['portrait', 'sharp'] },
      { id: 'light_correction', name: 'Light Correction', photocode: 'exposure: 10\nhighlights: -20\nshadows: 15', tags: ['lighting'] }
    ];

    for (const def of defaults) {
      const existing = await presetCache.get(def.id);
      if (!existing) {
        await presetCache.set({
          ...def,
          createdAt: Date.now()
        });
      }
    }
  }

  async createPreset(data: Omit<EntityPreset, 'id' | 'createdAt'>): Promise<EntityPreset> {
    const now = Date.now();
    const id = `preset_${now}_${data.name.replace(/\s+/g, '_').toLowerCase()}`;
    const preset: EntityPreset = {
      ...data,
      id,
      createdAt: now,
    };
    await presetCache.set(preset);
    return preset;
  }

  async updatePreset(id: string, updates: Partial<Omit<EntityPreset, 'id' | 'createdAt'>>): Promise<EntityPreset> {
    const existing = await presetCache.get(id);
    if (!existing) throw new Error(`Preset ${id} not found`);

    const updated: EntityPreset = {
      ...existing,
      ...updates,
    };
    await presetCache.set(updated);
    return updated;
  }

  async deletePreset(id: string): Promise<void> {
    await presetCache.delete(id);
  }

  async getPresetsByEntity(entityId: string): Promise<EntityPreset[]> {
    return await presetCache.getByEntity(entityId);
  }

  async getAllPresets(): Promise<EntityPreset[]> {
    return await presetCache.getAll();
  }

  async getPreset(id: string): Promise<EntityPreset | undefined> {
    return await presetCache.get(id);
  }
}

export const entityPresetManager = new EntityPresetManager();
