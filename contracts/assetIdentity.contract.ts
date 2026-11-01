// Asset Identity Contract
// Version: 1.0.0
export interface AssetIdentityInput {
  file: File;
}

export interface AssetIdentityOutput {
  assetId: string;
  hash: string;
}

// Rules:
// 1. same file -> same assetId
// 2. duplicate files must NOT create new asset
// 3. duplicates are linked, not duplicated
