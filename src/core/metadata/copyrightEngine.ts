import { ImageMetadata } from '../engines/metadata/exif';
import { ImportedAsset } from '../pipeline/import/importManagerTypes';

/**
 * 🧩 PART 7G.2.3 — METADATA ENGINE
 * Responsibility: Write metadata to EXIF, IPTC, XMP
 */

export interface CopyrightPayload {
  author: string;
  notice: string;
  email: string;
  website: string;
}

/**
 * 🧩 PART 7G.2.4 — FIELD MAPPING
 */
export const COPYRIGHT_FIELD_MAP = {
  author: {
    exif: "Artist",
    iptc: "Byline",
    xmp: "dc:creator"
  },
  notice: {
    exif: "Copyright",
    iptc: "CopyrightNotice",
    xmp: "dc:rights"
  },
  email: {
    xmp: "dc:creatorContactInfo/email"
  },
  website: {
    xmp: "dc:creatorContactInfo/url"
  }
};

/**
 * 🧩 PART 7G.2.5 — WRITE LOGIC
 * 🧩 PART 7G.2.6 — NON-DESTRUCTIVE RULE
 */
export function injectCopyrightField(metadata: ImageMetadata, field: string, value: string): ImageMetadata {
  const updated = { ...metadata };
  if (field === 'author') {
    updated.exif = { ...updated.exif, Artist: value };
    updated.iptc = { ...updated.iptc, Byline: value };
    updated.xmp = { ...updated.xmp, "dc:creator": value };
  } else if (field === 'notice') {
    updated.exif = { ...updated.exif, Copyright: value };
    updated.iptc = { ...updated.iptc, CopyrightNotice: value };
    updated.xmp = { ...updated.xmp, "dc:rights": value };
  } else if (field === 'email') {
    updated.xmp = { ...updated.xmp, "dc:creatorContactInfo": { ...updated.xmp?.["dc:creatorContactInfo"], email: value } };
  } else if (field === 'website') {
    updated.xmp = { ...updated.xmp, "dc:creatorContactInfo": { ...updated.xmp?.["dc:creatorContactInfo"], url: value } };
  }
  return updated;
}

export function injectCopyright(metadata: ImageMetadata, payload: CopyrightPayload): ImageMetadata {
  return {
    ...metadata,
    exif: {
      ...metadata.exif,
      Artist: payload.author || metadata.exif?.Artist,
      Copyright: payload.notice || metadata.exif?.Copyright
    },
    iptc: {
      ...metadata.iptc,
      Byline: payload.author || metadata.iptc?.Byline,
      CopyrightNotice: payload.notice || metadata.iptc?.CopyrightNotice
    },
    xmp: {
      ...metadata.xmp,
      "dc:creator": payload.author || metadata.xmp?.["dc:creator"],
      "dc:rights": payload.notice || metadata.xmp?.["dc:rights"],
      "dc:creatorContactInfo": {
        ...metadata.xmp?.["dc:creatorContactInfo"],
        email: payload.email || metadata.xmp?.["dc:creatorContactInfo"]?.email,
        url: payload.website || metadata.xmp?.["dc:creatorContactInfo"]?.url
      }
    }
  };
}

/**
 * 🧩 PART 7G.2.7 — BATCH PROCESSING
 */
export function injectBatch(assets: ImportedAsset[], payload: CopyrightPayload): ImportedAsset[] {
  return assets.map(asset => ({
    ...asset,
    metadata: injectCopyright(asset.metadata, payload)
  }));
}
