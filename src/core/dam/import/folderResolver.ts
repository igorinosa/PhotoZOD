import { ImportPreset } from './importPresets';

export function resolveFolderPath(file: File, preset: ImportPreset): string {
  const date = new Date(file.lastModified);
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  let path = preset.folderPattern;
  path = path.replace(/\{year\}/g, year);
  path = path.replace(/\{month\}/g, month);
  path = path.replace(/\{day\}/g, day);
  
  // Ensure it starts and ends with a slash
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.endsWith('/')) path = path + '/';

  return path;
}

export function resolveFilename(file: File, preset: ImportPreset, index: number): string {
  const originalName = file.name;
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));

  let newName = preset.renamePattern;
  newName = newName.replace(/\{filename\}/g, nameWithoutExt);
  newName = newName.replace(/\{index\}/g, index.toString().padStart(4, '0'));

  return newName + extension;
}
