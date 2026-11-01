import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import { importState } from '../../../../core/pipeline/import/importState';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  assetId?: string;
  fallback?: React.ReactNode;
  retryCount?: number;
  priority?: boolean;
}

/**
 * A robust image component that handles lazy loading via IntersectionObserver,
 * retries on failure, and provides smooth transitions and loading states.
 */
export const SmartImage: React.FC<SmartImageProps> = (props) => {
  const { 
    src, 
    assetId,
    alt, 
    className, 
    fallback, 
    retryCount = 3,
    priority = false,
    ...rest 
  } = props;
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentRetry, setCurrentRetry] = useState(0);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  useEffect(() => {
    if (!currentSrc) {
      setStatus('error');
      return;
    }

    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '300px', // Proactively load images 300px before they enter viewport
        threshold: 0.01 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [currentSrc]);

  const handleLoad = () => {
    setStatus('loaded');
  };

  const handleError = async () => {
    if (currentRetry < retryCount) {
      console.warn(`[SmartImage] Retrying load for ${currentSrc} (Attempt ${currentRetry + 1}/${retryCount})`);
      
      // If it's a blob URL and it failed, try to refresh it via importState
      if (assetId && currentSrc?.startsWith('blob:')) {
        console.log(`[SmartImage] Attempting to refresh stale blob URL for asset ${assetId}`);
        const newUrl = await importState.refreshAsset(assetId);
        if (newUrl && newUrl !== currentSrc) {
          setCurrentSrc(newUrl);
          // The useEffect on currentSrc will reset the retry count and status
          return;
        }
      }

      setTimeout(() => {
        setCurrentRetry(prev => prev + 1);
        setLoadKey(prev => prev + 1); // Trigger re-render of the img tag
      }, 500 * (currentRetry + 1)); // Exponential backoff
    } else {
      console.error(`[SmartImage] Failed to load image after ${retryCount} retries: ${currentSrc}`);
      setStatus('error');
    }
  };

  // Reset status if src changes
  useEffect(() => {
    setStatus('loading');
    setCurrentRetry(0);
    setLoadKey(0);
  }, [currentSrc]);

  if (!isInView) {
    return (
      <div 
        ref={containerRef} 
        className={`${className} bg-zinc-900/50 animate-pulse flex items-center justify-center`}
      >
        <ImageIcon className="w-6 h-6 text-zinc-800" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`${className} flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-700`}>
        {fallback || (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">Load Failed</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden flex items-center justify-center ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse flex items-center justify-center z-10">
           <ImageIcon className="w-6 h-6 text-zinc-800" />
        </div>
      )}
      <img
        key={`${currentSrc}-${loadKey}`}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover ${status === 'loaded' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 ease-out absolute inset-0 m-auto`}
        style={className?.includes('object-contain') ? { objectFit: 'contain' } : {}}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
        {...rest}
      />
    </div>
  );
};
