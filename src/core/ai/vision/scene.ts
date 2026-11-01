export function classifyScene(tags: string[]): string {
  const safeTags = tags || [];
  if (safeTags.includes("beach") || safeTags.includes("water") || safeTags.includes("ocean")) return "outdoor_beach";
  if (safeTags.includes("studio") || safeTags.includes("indoor")) return "studio";
  if (safeTags.includes("sunset") || safeTags.includes("field") || safeTags.includes("nature")) return "outdoor_nature";
  if (safeTags.includes("portrait") || safeTags.includes("person") || safeTags.includes("woman") || safeTags.includes("man")) return "portrait";
  return "general";
}
