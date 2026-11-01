import { ImageMetadata } from '../engines/metadata/exif';

export type ScrubMode = 'safe' | 'full' | 'custom';

export interface ScrubParams {
  mode: ScrubMode;
  remove?: string[];
  preserve?: string[];
}

const METADATA_FIELDS = {
  gps: ["gpsLatitude", "gpsLongitude", "gpsAltitude"],
  serial: ["bodySerialNumber", "lensSerialNumber"],
  device: ["cameraOwnerName"],
  software: ["software"],
  location: ["location", "city", "country"]
};

export function scrubMetadata(metadata: ImageMetadata, params: ScrubParams): ImageMetadata {
  const mode = params.mode || 'safe';
  const cleaned = { ...metadata };

  const removeFields = new Set<string>();

  if (mode === 'safe') {
    // Safe mode removes GPS, serial, device
    METADATA_FIELDS.gps.forEach(f => removeFields.add(f));
    METADATA_FIELDS.serial.forEach(f => removeFields.add(f));
    METADATA_FIELDS.device.forEach(f => removeFields.add(f));
  } else if (mode === 'full') {
    // Full mode removes EVERYTHING except minimal required
    // We'll just clear out most things, keeping only basic image properties if they existed
    // But for our ImageMetadata interface, we'll clear specific known PII/extra fields
    Object.values(METADATA_FIELDS).flat().forEach(f => removeFields.add(f));
    removeFields.add('camera');
    removeFields.add('lens');
    removeFields.add('copyright');
    removeFields.add('author');
    removeFields.add('date');
  } else if (mode === 'custom') {
    if (params.remove) {
      let removeList = params.remove;
      if (typeof removeList === 'string') {
        removeList = (removeList as string).replace(/^\[|\]$/g, '').split(',').map(s => s.trim());
      }
      removeList.forEach(group => {
        const fields = METADATA_FIELDS[group as keyof typeof METADATA_FIELDS];
        if (fields) {
          fields.forEach(f => removeFields.add(f));
        } else {
          // If it's a direct field name
          removeFields.add(group);
        }
      });
    }
  }

  // Apply preserves
  if (params.preserve) {
    let preserveList = params.preserve;
    if (typeof preserveList === 'string') {
      preserveList = (preserveList as string).replace(/^\[|\]$/g, '').split(',').map(s => s.trim());
    }
    preserveList.forEach(group => {
      const fields = METADATA_FIELDS[group as keyof typeof METADATA_FIELDS];
      if (fields) {
        fields.forEach(f => removeFields.delete(f));
      } else {
        removeFields.delete(group);
      }
    });
  }

  // Execute removal
  removeFields.forEach(field => {
    if (field in cleaned) {
      delete (cleaned as any)[field];
    }
  });

  return cleaned;
}
