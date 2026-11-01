export type FormatGroup = "raw" | "jpeg" | "png" | "heic" | "other";

export const FORMAT_MAPPING: Record<string, FormatGroup> = {
  // RAW
  "cr2": "raw",
  "nef": "raw",
  "arw": "raw",
  "dng": "raw",
  "raf": "raw",
  
  // JPEG
  "jpg": "jpeg",
  "jpeg": "jpeg",
  
  // PNG
  "png": "png",
  
  // HEIC
  "heic": "heic",
  "heif": "heic",
  
  // OTHER
  "tiff": "other",
  "tif": "other",
  "webp": "other",
  "bmp": "other",
  "gif": "other"
};
