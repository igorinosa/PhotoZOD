import { applyEntityPreset } from '../../entities/presets/binding';
import { evaluateRules } from '../../entities/workflows/rules';
import { entityManager } from '../../entities/entityManager';

export async function autoApplyPresets(assetId: string): Promise<string[]> {
  const entityIds = await entityManager.getEntitiesForAsset(assetId);
  const photocodes: string[] = [];

  for (const entityId of entityIds) {
    const entity = await entityManager.get(entityId);
    if (!entity) continue;

    // 1. Get bound presets
    const presets = await applyEntityPreset(entityId);
    photocodes.push(...presets);

    // 2. Evaluate workflow rules
    const ruleCodes = await evaluateRules(entity);
    photocodes.push(...ruleCodes);
  }

  return photocodes;
}
