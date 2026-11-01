export async function scanDirectory(handle: FileSystemDirectoryHandle): Promise<File[]> {
  const files: File[] = [];

  for await (const entry of (handle as any).values()) {
    if (entry.kind === "file") {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      files.push(file);
    } else if (entry.kind === "directory") {
      const dirHandle = entry as FileSystemDirectoryHandle;
      files.push(...await scanDirectory(dirHandle));
    }
  }

  return files;
}
