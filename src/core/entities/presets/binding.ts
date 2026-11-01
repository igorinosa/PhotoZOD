import { entityPresetManager } from './entityPresetManager';

export async function bindPresetToEntity(entityId: string, presetId: string): Promise<void> {
  const preset = await entityPresetManager.getPreset(presetId);
  if (!preset) throw new Error("Preset not found");

  await entityPresetManager.updatePreset(presetId, { entityId });
}

export async function applyEntityPreset(entityId: string): Promise<string[]> {
  const presets = await entityPresetManager.getPresetsByEntity(entityId);
  const photocodes: string[] = [];
  
  for (const p of presets) {
    let code = p.photocode || '';
    // Inject entity scope if not present
    if (!code.includes('entity:')) {
      code = `entity: ${entityId}\n  ${code.split('\n').join('\n  ')}`;
    }
    photocodes.push(code);
  }
  
  return photocodes;
}
