import { ImportedAsset, ImportProgress, ProcessOptions } from './importManagerTypes';
import { orchestrator } from '../../runtime/orchestrator';
import { enqueueImport } from './importQueue';

export async function processFile(
  file: File, 
  onProgress?: (progress: ImportProgress) => void,
  options: ProcessOptions = {}
): Promise<ImportedAsset> {
  return orchestrator.processAsset(file, onProgress, options);
}

export class ImportManager {
  async importImage(file: File, onProgress?: (progress: ImportProgress) => void): Promise<ImportedAsset> {
    return processFile(file, onProgress);
  }

  async importBatch(files: File[], onProgress?: (progress: ImportProgress) => void): Promise<ImportedAsset[]> {
    const assets: ImportedAsset[] = [];
    for (const file of files) {
      try {
        const asset = await this.importImage(file, onProgress);
        assets.push(asset);
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
      }
    }
    return assets;
  }

  async importAssets(files: File[]) {
    for (const file of files) {
      enqueueImport(file);
    }
  }
}

export const importManager = new ImportManager();
