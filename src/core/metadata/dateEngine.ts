import { ImageMetadata } from '../engines/metadata/exif';
import { ImportedAsset } from '../pipeline/import/importManagerTypes';

/**
 * 🧩 PART 7G.1.3 — ENGINE MODULE
 * Responsibility: Read EXIF date → apply transformation → write updated date
 */

export function applyDateShift(metadata: ImageMetadata, shiftMs: number): ImageMetadata {
  // 🧩 PART 7G.1.5 — APPLY SHIFT LOGIC
  // Rule: Do NOT overwrite original permanently. Store as derived value.
  const original = metadata.originalCaptureTime || metadata.captureTime || new Date(metadata.dateTaken).getTime();
  const updated = original + shiftMs;

  if (isNaN(updated)) {
    console.warn("[DateEngine] Invalid updated time calculated", { original, shiftMs });
    return metadata;
  }

  return {
    ...metadata,
    captureTime: updated,
    dateTaken: new Date(updated).toISOString()
  };
}

export function setAbsoluteDate(metadata: ImageMetadata, date: string | number | Date): ImageMetadata {
  const updated = new Date(date).getTime();

  if (isNaN(updated)) {
    console.warn("[DateEngine] Invalid absolute date provided", { date });
    return metadata;
  }

  return {
    ...metadata,
    captureTime: updated,
    dateTaken: new Date(updated).toISOString()
  };
}

/**
 * 🧩 PART 7G.1.6 — BATCH PROCESSING
 * Works on 10,000 images instantly
 */
export function applyDateShiftBatch(assets: ImportedAsset[], shiftMs: number): ImportedAsset[] {
  return assets.map(asset => {
    return {
      ...asset,
      metadata: applyDateShift(asset.metadata, shiftMs)
    };
  });
}

export function setAbsoluteDateBatch(assets: ImportedAsset[], date: string): ImportedAsset[] {
  return assets.map(asset => {
    return {
      ...asset,
      metadata: setAbsoluteDate(asset.metadata, date)
    };
  });
}
