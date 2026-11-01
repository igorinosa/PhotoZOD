import { generatePhotoCode } from './generator';
import { entityPresetManager, EntityPreset } from '../entities/presets/entityPresetManager';
import { bindPresetToEntity } from '../entities/presets/binding';

export async function generatePresetFromPrompt(prompt: string, entityId: string, entityName: string): Promise<EntityPreset> {
  // 1. Generate PhotoCode using ZOD
  const code = await generatePhotoCode(prompt);

  // 2. Wrap in entity scope if not already
  let finalCode = code;
  if (!code.includes(`entity: ${entityName}`)) {
    finalCode = `entity: ${entityName}\n  ${code.split('\n').join('\n  ')}`;
  }

  // 3. Create Preset
  const preset = await entityPresetManager.createPreset({
    name: `AI: ${prompt.substring(0, 20)}...`,
    photocode: finalCode,
    tags: ['ai-generated'],
    entityId
  });

  // 4. Bind to Entity
  await bindPresetToEntity(entityId, preset.id);

  return preset;
}
