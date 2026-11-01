import { EntityPreset, entityPresetManager } from './entityPresetManager';

export interface PresetVersion {
  presetId: string;
  version: number;
  timestamp: number;
  action: string;
  snapshot: EntityPreset;
}

class PresetVersioningSystem {
  private versions: Map<string, PresetVersion[]> = new Map();

  async trackVersion(preset: EntityPreset, action: string): Promise<void> {
    const currentVersions = this.versions.get(preset.id) || [];
    const nextVersion = currentVersions.length + 1;
    
    const versionRecord: PresetVersion = {
      presetId: preset.id,
      version: nextVersion,
      timestamp: Date.now(),
      action,
      snapshot: JSON.parse(JSON.stringify(preset)) // deep copy
    };

    currentVersions.push(versionRecord);
    this.versions.set(preset.id, currentVersions);
  }

  async getVersions(presetId: string): Promise<PresetVersion[]> {
    return this.versions.get(presetId) || [];
  }

  async revertPreset(presetId: string, version: number): Promise<EntityPreset | undefined> {
    const versions = this.versions.get(presetId);
    if (!versions) return undefined;
    const v = versions.find(v => v.version === version);
    if (!v) return undefined;

    // Restore snapshot
    await entityPresetManager.updatePreset(presetId, v.snapshot);

    // Track the revert action
    await this.trackVersion(v.snapshot, `revert_to_${version}`);

    return await entityPresetManager.getPreset(presetId);
  }
}

export const presetVersioningSystem = new PresetVersioningSystem();
