export type ImportPreset = {
  id: string;
  name: string;
  renamePattern: string;
  folderPattern: string;
  skipDuplicates: boolean;
};

export const DEFAULT_PRESET: ImportPreset = {
  id: 'default',
  name: 'Default',
  renamePattern: '{filename}',
  folderPattern: '/{year}/{month}/',
  skipDuplicates: true,
};
