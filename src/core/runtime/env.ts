export const env = {
  isWebGPUAvailable: async (): Promise<boolean> => {
    if (!(navigator as any).gpu) return false;
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      return !!adapter;
    } catch (e) {
      return false;
    }
  },
  isFileSystemAccessSupported: 'showDirectoryPicker' in window,
  isOPFSSupported: navigator.storage && navigator.storage.getDirectory !== undefined,
  isSharedArrayBufferSupported: typeof SharedArrayBuffer !== 'undefined',
};
