export function extractTags(caption: string): string[] {
  // Simple tag extraction: split by spaces, remove punctuation, filter short words
  return (caption || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3);
}
