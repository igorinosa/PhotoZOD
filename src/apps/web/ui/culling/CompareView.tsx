import { useEffect, useState } from 'react';
import { SmartImage } from '../components/SmartImage';
import { Asset } from '../../../../core/dam/types';
import { getAssetUIData, loadAssetUIData } from '../../../../core/dam/assetUrlCache';

export function CompareView({ assets }: { assets: Asset[] }) {
  const gridClass = assets.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';
  const [, setForceRender] = useState(0);

  useEffect(() => {
    let loaded = false;
    assets.forEach(asset => {
      if (!getAssetUIData(asset.assetId)) {
        loadAssetUIData(asset.assetId).then(() => {
          if (!loaded) {
            loaded = true;
            setForceRender(prev => prev + 1);
          }
        });
      }
    });
  }, [assets]);

  return (
    <div className={`w-full h-full grid ${gridClass} gap-2 p-2 bg-zinc-950`}>
      {assets.map(asset => {
        const uiData = getAssetUIData(asset.assetId);
        return (
          <div key={asset.assetId} className="relative rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center">
            {uiData?.previewUrl ? (
              <SmartImage 
                src={uiData.previewUrl} 
                assetId={asset.assetId}
                className="w-full h-full object-contain"
                alt={asset.fileName}
                retryCount={5}
              />
            ) : (
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
