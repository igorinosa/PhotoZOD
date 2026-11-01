import { resolveType } from './fileType';
import { previewExtractor } from './previewExtractor';

export async function decodeFile(file: File): Promise<Blob> {
  const type = resolveType(file);

  if (type === "raw") {
    return decodeRAW(file);
  }

  return decodeStandard(file);
}

async function decodeRAW(file: File): Promise<Blob> {
  // Use existing previewExtractor for RAW
  const preview = await previewExtractor.extractPreview(file);
  if (!preview) throw new Error("Failed to extract RAW preview");
  return preview;
}

async function decodeStandard(file: File): Promise<Blob> {
  // For standard images, we can just use the file as a Blob
  return file;
}
