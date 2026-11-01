import { FEATURE_REGISTRY } from './featureRegistry';

export function validateSystemFeatures() {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, feature] of Object.entries(FEATURE_REGISTRY)) {
    if (!feature.engine || !feature.engine.name) {
      errors.push(`[${key}] Missing engine name`);
    }
    if (!feature.engine || !feature.engine.method) {
      errors.push(`[${key}] Missing engine method`);
    }
    if (!feature.zod || !feature.zod.intents || feature.zod.intents.length === 0) {
      warnings.push(`[${key}] Missing ZOD intents`);
    }
    if (!feature.photocode || !feature.photocode.syntax) {
      errors.push(`[${key}] Missing photocode syntax`);
    }
  }

  if (errors.length > 0) {
    console.error("❌ Feature Validation Failed:", errors);
    throw new Error("System features validation failed. See logs.");
  }

  if (warnings.length > 0) {
    console.warn("⚠️ Feature Validation Warnings:", warnings);
  } else {
    console.log("✅ All features validated successfully.");
  }

  return { errors, warnings, total: Object.keys(FEATURE_REGISTRY).length };
}
