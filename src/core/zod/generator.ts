import { FEATURE_REGISTRY } from '../system/featureRegistry';

// Mock ZOD AI Generator
export async function generatePhotoCode(prompt: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const lowerPrompt = prompt.toLowerCase();
  
  // A simple mock interpreter using the registry
  let generated = '';
  for (const [key, feature] of Object.entries(FEATURE_REGISTRY)) {
    if (feature.category === 'adjustment' || feature.category === 'retouch') {
      for (const intent of feature.zod.intents) {
        if (lowerPrompt.includes(intent)) {
          // Add some mock value
          const val = feature.params.max ? Math.floor(feature.params.max * 0.5) : 10;
          generated += `  ${key}: ${val}\n`;
          break;
        }
      }
    }
  }

  if (generated) return generated.trimEnd();

  // Default generic enhancement
  return `  Exposure: 0.1\n  Contrast: 5\n  Vibrance: 10\n  Sharpness: 15`;
}
