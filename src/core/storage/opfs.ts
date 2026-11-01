export class OPFSManager {
  private root: FileSystemDirectoryHandle | null = null;

  async init() {
    if (!this.root) {
      this.root = await navigator.storage.getDirectory();
    }
    return this.root;
  }

  async saveFile(assetId: string, type: 'original' | 'preview', blob: Blob): Promise<void> {
    const root = await this.init();
    
    // Create /assets/assetId/
    const assetsDir = await root.getDirectoryHandle('assets', { create: true });
    const assetDir = await assetsDir.getDirectoryHandle(assetId, { create: true });
    
    const fileName = type === 'original' ? 'original.raw' : 'preview.jpg';
    
    // createWritable is atomic in OPFS. It writes to a swap file and replaces on close().
    const fileHandle = await assetDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      console.error(`[OPFS] Failed to write file ${assetId}/${fileName}:`, error);
      throw error;
    }
  }

  async getFile(assetId: string, type: 'original' | 'preview'): Promise<Blob | null> {
    try {
      const root = await this.init();
      const assetsDir = await root.getDirectoryHandle('assets');
      const assetDir = await assetsDir.getDirectoryHandle(assetId);
      const fileName = type === 'original' ? 'original.raw' : 'preview.jpg';
      const fileHandle = await assetDir.getFileHandle(fileName);
      return await fileHandle.getFile();
    } catch (error) {
      // File not found or directory not found
      return null;
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    try {
      const root = await this.init();
      const assetsDir = await root.getDirectoryHandle('assets');
      await assetsDir.removeEntry(assetId, { recursive: true });
    } catch (error) {
      // Directory not found, ignore
    }
  }

  async clearAll(): Promise<void> {
    try {
      const root = await this.init();
      await root.removeEntry('assets', { recursive: true });
    } catch (error) {
      // Directory not found, ignore
    }
  }
}

export const opfsManager = new OPFSManager();
