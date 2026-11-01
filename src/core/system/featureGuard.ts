import { FEATURE_REGISTRY } from './featureRegistry';

export function assertFeature(key: string): void {
  // Normalize key for lookup
  const normalizedKey = Object.keys(FEATURE_REGISTRY).find(
    k => k.toLowerCase().replace(/\s+/g, '') === key.toLowerCase().replace(/\s+/g, '')
  );

  if (!normalizedKey || !FEATURE_REGISTRY[normalizedKey]) {
    throw new Error(`Feature ${key} not registered`);
  }
}

export function getFeature(key: string) {
  const normalizedKey = Object.keys(FEATURE_REGISTRY).find(
    k => k.toLowerCase().replace(/\s+/g, '') === key.toLowerCase().replace(/\s+/g, '')
  );

  if (!normalizedKey || !FEATURE_REGISTRY[normalizedKey]) {
    throw new Error(`Feature ${key} not registered`);
  }

  return FEATURE_REGISTRY[normalizedKey];
}
