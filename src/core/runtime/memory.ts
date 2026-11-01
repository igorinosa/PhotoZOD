export function releaseBuffer(buffer: any) {
  if (!buffer) return;
  
  // If it's a typed array, we can't explicitly free it in JS, 
  // but we can help the GC by nulling references if wrapped in an object
  
  // If it has a close method (like ImageBitmap)
  if (typeof buffer.close === 'function') {
    try {
      buffer.close();
    } catch (e) {
      console.error("Failed to close buffer", e);
    }
  }
  
  // If it's an object URL
  if (typeof buffer === 'string' && buffer.startsWith('blob:')) {
    URL.revokeObjectURL(buffer);
  }
}

export class BufferPool {
  private buffers: Set<any> = new Set();
  
  track(buffer: any) {
    if (buffer) this.buffers.add(buffer);
    return buffer;
  }
  
  release(buffer: any) {
    if (this.buffers.has(buffer)) {
      releaseBuffer(buffer);
      this.buffers.delete(buffer);
    }
  }
  
  releaseAll() {
    for (const buffer of this.buffers) {
      releaseBuffer(buffer);
    }
    this.buffers.clear();
  }
}

export const globalBufferPool = new BufferPool();
