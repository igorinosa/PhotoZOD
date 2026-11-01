export class FileSystemManager {
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  async requestAccess(): Promise<boolean> {
    try {
      if ('showDirectoryPicker' in window) {
        try {
          this.directoryHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
          });
          return true;
        } catch (err: any) {
          if (err.name === 'SecurityError' || err.message?.includes('Cross origin sub frames') || err.message?.includes('user activation')) {
            console.warn('showDirectoryPicker blocked, falling back to OPFS');
            if (navigator.storage && navigator.storage.getDirectory) {
              this.directoryHandle = await navigator.storage.getDirectory();
              return true;
            }
          }
          throw err;
        }
      } else if (navigator.storage && navigator.storage.getDirectory) {
        // Fallback to OPFS
        this.directoryHandle = await navigator.storage.getDirectory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting file system access:', error);
      return false;
    }
  }

  async listFiles(): Promise<string[]> {
    if (!this.directoryHandle) throw new Error('No directory access');
    const files: string[] = [];
    for await (const entry of (this.directoryHandle as any).values()) {
      if (entry.kind === 'file') {
        files.push(entry.name);
      }
    }
    return files;
  }

  async writeFile(filename: string, content: string | Blob): Promise<void> {
    if (!this.directoryHandle) throw new Error('No directory access');
    try {
      const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  async readFile(filename: string): Promise<File> {
    if (!this.directoryHandle) throw new Error('No directory access');
    const fileHandle = await this.directoryHandle.getFileHandle(filename);
    return await fileHandle.getFile();
  }

  async getAllFiles(): Promise<File[]> {
    if (!this.directoryHandle) throw new Error('No directory access');
    const files: File[] = [];
    for await (const entry of (this.directoryHandle as any).values()) {
      if (entry.kind === 'file') {
        const fileHandle = await this.directoryHandle.getFileHandle(entry.name);
        files.push(await fileHandle.getFile());
      }
    }
    return files;
  }
  
  hasAccess(): boolean {
    return this.directoryHandle !== null;
  }
}

export const fsManager = new FileSystemManager();
