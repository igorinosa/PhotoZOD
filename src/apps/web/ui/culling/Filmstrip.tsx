import { useEffect, useRef, useState } from 'react';
import { SmartImage } from '../components/SmartImage';
import { assetStore } from '../../../../core/dam/assetStore';
import { cullingSession } from '../../../../core/culling/cullingSession';
import { goTo } from '../../../../core/culling/navigation';
import { getAssetUIData, loadAssetUIData } from '../../../../core/dam/assetUrlCache';

export function Filmstrip({ currentId }: { currentId: string }) {
  const [allIds, setAllIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setForceRender] = useState(0);

  useEffect(() => {
    const update = () => {
      setAllIds(cullingSession.getAll());
      setCurrentIndex(cullingSession.currentIndex());
    };
    update();
    const unsubscribe = cullingSession.subscribe(update);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    // Preload visible thumbnails
    allIds.slice(Math.max(0, currentIndex - 5), currentIndex + 10).forEach(id => {
      if (!getAssetUIData(id)) {
        loadAssetUIData(id).then(() => setForceRender(prev => prev + 1));
      }
    });
  }, [allIds, currentIndex]);

  useEffect(() => {
    if (scrollRef.current && scrollRef.current.children.length > currentIndex) {
      const activeEl = scrollRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentIndex]);

  return (
    <div className="h-24 bg-zinc-900 border-t border-zinc-800 flex items-center px-2 overflow-x-auto shrink-0" ref={scrollRef}>
      {allIds.map((id, index) => {
        const asset = assetStore.get(id);
        if (!asset) return null;
        const isActive = index === currentIndex;
        const uiData = getAssetUIData(id);
        
        return (
          <div 
            key={id}
            onClick={() => goTo(index)}
            className={`h-20 w-20 shrink-0 mx-1 rounded-md overflow-hidden cursor-pointer border-2 transition-colors bg-zinc-800 flex items-center justify-center ${
              isActive ? 'border-indigo-500' : 'border-transparent hover:border-zinc-500'
            }`}
          >
            {uiData?.thumbnailUrl ? (
              <SmartImage 
                src={uiData.thumbnailUrl} 
                assetId={id}
                className="w-full h-full object-cover"
                alt={asset.fileName}
                retryCount={5}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
