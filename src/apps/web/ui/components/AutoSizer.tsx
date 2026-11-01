import React, { useRef, useState, useEffect } from 'react';

interface AutoSizerProps {
  children: (size: { width: number; height: number }) => React.ReactNode;
}

export const AutoSizer: React.FC<AutoSizerProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    
    // Initial size
    setSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
};
