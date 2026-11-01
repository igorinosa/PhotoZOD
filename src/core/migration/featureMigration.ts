import { FEATURE_REGISTRY } from '../system/featureRegistry';

export function migratePhotoCode(code: string): string {
  let migratedCode = code;

  // Example mappings from old to new
  const migrations: Record<string, string> = {
    "FixTime": "Metadata.Date.shift",
    "SetTime": "Metadata.Date.set",
    "Watermark": "Metadata.Copyright"
  };

  for (const [oldKey, newKey] of Object.entries(migrations)) {
    const regex = new RegExp(`^\\s*${oldKey}:`, 'gm');
    migratedCode = migratedCode.replace(regex, `${newKey}:`);
  }

  return migratedCode;
}
