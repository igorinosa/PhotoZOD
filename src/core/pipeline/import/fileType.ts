export function resolveType(file: File): 'raw' | 'jpeg' | 'png' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (["cr2", "cr3", "nef", "arw", "dng"].includes(ext)) return "raw";
  if (["jpg", "jpeg"].includes(ext)) return "jpeg";
  if (["png"].includes(ext)) return "png";

  return "unknown";
}
