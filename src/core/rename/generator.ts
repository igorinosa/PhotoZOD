import { ImportedAsset } from '../pipeline/import/importManagerTypes';

/**
 * 🧩 PART 7F.3 — INDEX GENERATOR
 * Sequential, zero-padded, deterministic.
 * Default to 6 digits as per user request (000001).
 */
export function generateIndex(i: number, pad = 6): string {
  return String(i).padStart(pad, "0");
}

/**
 * 🧩 PART 7F.4 — METADATA EXTRACTION
 * Extract date and time from asset metadata.
 */
export function getAssetDateInfo(asset: ImportedAsset) {
  const dateStr = asset.metadata?.dateTaken || new Date(asset.createdAt).toISOString();
  const date = new Date(dateStr);
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}-${min}-${ss}`
  };
}

/**
 * 🧩 PART 7F.5 — NAME GENERATOR ENGINE
 * Pure function to generate a new filename based on a pattern.
 */
export function generateName(
  pattern: string, 
  asset: ImportedAsset, 
  index: number,
  custom: string = ""
): string {
  const dateInfo = getAssetDateInfo(asset);
  const originalName = asset.fileName.split('.').slice(0, -1).join('.');
  const extension = asset.fileName.split('.').pop() || "";
  const extWithDot = extension ? `.${extension}` : "";

  return pattern
    .replace(/{index}/g, generateIndex(index))
    .replace(/{date}/g, dateInfo.date)
    .replace(/{time}/g, dateInfo.time)
    .replace(/{original}/g, originalName)
    .replace(/{ext}/g, extWithDot)
    .replace(/{custom}/g, custom);
}

/**
 * 🧩 PART 7F.6 — COLLISION HANDLING
 * Auto-resolve collisions by appending a counter.
 */
export function resolveCollision(name: string, existing: Set<string>): string {
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex !== -1 ? name.substring(0, dotIndex) : name;
  const ext = dotIndex !== -1 ? name.substring(dotIndex) : "";
  
  let counter = 1;
  let newName = name;

  while (existing.has(newName)) {
    newName = `${base}_${counter}${ext}`;
    counter++;
  }

  return newName;
}
