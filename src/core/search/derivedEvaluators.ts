export const isNoColor = (asset: any) => {
  return asset.colorTag === 'none';
};

export const isUnrated = (asset: any) => {
  return !asset.rating || asset.rating === 0;
};

export const isUntagged = (asset: any) => {
  return !asset.ai?.tags || asset.ai.tags.length === 0;
};

export const isNoPeople = (asset: any) => {
  return !asset.ai?.faces || asset.ai.faces.length === 0;
};

export const isEdited = (asset: any) => {
  return !!(asset.activeVersionId && asset.activeVersionId !== asset.assetId);
};

export const isBatch = (asset: any) => {
  return !!(asset.batchIds && asset.batchIds.length > 0);
};
