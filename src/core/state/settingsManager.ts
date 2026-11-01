import { CopyrightPayload, injectCopyright } from '../metadata/copyrightEngine';
import { Asset } from '../dam/types';
import { ImageMetadata } from '../engines/metadata/exif';
import { ImportedAsset } from '../pipeline/import/importManagerTypes';

interface GlobalSettings {
  autoApplyCopyright: boolean;
  defaultCopyright: CopyrightPayload | null;
  autoDeleteAfterDays?: number | null;
}

class SettingsManager {
  private settings: GlobalSettings = {
    autoApplyCopyright: false,
    defaultCopyright: null,
    autoDeleteAfterDays: null
  };

  public updateSettings(newSettings: Partial<GlobalSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): GlobalSettings {
    return { ...this.settings };
  }

  public applyAutoCopyright(asset: Asset, metadata: ImageMetadata): { asset: Asset, metadata: ImageMetadata } {
    if (this.settings.autoApplyCopyright && this.settings.defaultCopyright) {
      const updatedMetadata = injectCopyright(metadata, this.settings.defaultCopyright);
      return {
        asset: {
          ...asset,
          exif: {
            ...asset.exif,
            Artist: updatedMetadata.exif?.Artist,
            Copyright: updatedMetadata.exif?.Copyright
          }
        },
        metadata: updatedMetadata
      };
    }
    return { asset, metadata };
  }
}

export const settingsManager = new SettingsManager();
