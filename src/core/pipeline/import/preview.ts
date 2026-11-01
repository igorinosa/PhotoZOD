export async function generatePreview(blob: Blob): Promise<Blob> {
  // In a real app, we'd use wasm-vips to resize the buffer to 512px.
  // For this prototype, if it's already a preview from RAW, we just return it.
  // If it's a large JPEG, we can use Canvas to downscale it.
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const MAX_SIZE = 512;
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      } else {
        // Already small enough
        resolve(blob);
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((resultBlob) => {
        if (resultBlob) resolve(resultBlob);
        else resolve(blob); // fallback
      }, 'image/jpeg', 0.85);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob); // fallback to original
    };
    
    img.src = url;
  });
}
