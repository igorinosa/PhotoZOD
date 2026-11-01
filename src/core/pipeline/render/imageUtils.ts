export async function blobToFloat32Array(blob: Blob): Promise<{ buffer: Float32Array, width: number, height: number }> {
  const img = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const buffer = new Float32Array(imageData.data.length);
  for (let i = 0; i < imageData.data.length; i++) {
    buffer[i] = imageData.data[i] / 255.0; // Normalize to 0-1
  }
  
  return { buffer, width: canvas.width, height: canvas.height };
}

export async function float32ArrayToBlob(buffer: Float32Array, width: number, height: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < buffer.length; i++) {
    imageData.data[i] = Math.max(0, Math.min(255, Math.round(buffer[i] * 255)));
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
}
