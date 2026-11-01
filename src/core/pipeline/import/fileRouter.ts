export interface RouteResult {
  type: 'RAW' | 'JPEG' | 'TIFF' | 'HEIC' | 'UNKNOWN';
  decoder: 'libraw' | 'vips' | 'browser';
}

export async function routeFile(file: File): Promise<RouteResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  // RAW formats
  if (['cr2', 'cr3', 'nef', 'arw', 'dng'].includes(ext || '')) {
    return { type: 'RAW', decoder: 'libraw' };
  }
  
  // High-efficiency formats
  if (['heic', 'heif'].includes(ext || '')) {
    return { type: 'HEIC', decoder: 'vips' };
  }
  
  // Standard formats
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
    return { type: 'JPEG', decoder: 'browser' };
  }
  
  // TIFF
  if (['tif', 'tiff'].includes(ext || '')) {
    return { type: 'TIFF', decoder: 'vips' };
  }
  
  return { type: 'UNKNOWN', decoder: 'browser' };
}
