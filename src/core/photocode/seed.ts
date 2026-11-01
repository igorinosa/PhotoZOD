// Simple string hash function for deterministic seeds
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function generateSeed(imageId: string, opId: string, seedStr?: string): string {
  if (seedStr) return seedStr;
  // Deterministic seed: hash(imageId + opId)
  return hashString(`${imageId}_${opId}`);
}
