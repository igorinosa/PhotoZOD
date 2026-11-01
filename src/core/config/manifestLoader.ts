import manifestData from './assetManifest.json';

export interface AssetManifest {
  version: string;
  assets: any[];
}

export class ManifestLoader {
  private manifest: AssetManifest;

  constructor() {
    this.manifest = manifestData as AssetManifest;
  }

  getManifest(): AssetManifest {
    return this.manifest;
  }

  getAssetCount(): number {
    return this.manifest.assets.length;
  }
  
  getVersion(): string {
    return this.manifest.version;
  }
}

export const manifestLoader = new ManifestLoader();
