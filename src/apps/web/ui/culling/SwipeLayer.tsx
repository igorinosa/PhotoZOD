import { useState } from 'react';

interface SwipeLayerProps {
  children: React.ReactNode;
  onAction: (action: 'keep' | 'maybe' | 'trash' | 'back') => void;
}

export function SwipeLayer({ children, onAction }: SwipeLayerProps) {
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isAnimating) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartX(clientX);
    setStartY(clientY);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (startX === null || startY === null || isAnimating) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffsetX(clientX - startX);
    setOffsetY(clientY - startY);
  };

  const handleTouchEnd = () => {
    if (startX === null || isAnimating) return;
    
    const threshold = 10;
    let action: 'keep' | 'maybe' | 'trash' | 'back' | null = null;

    if (offsetX > threshold) action = 'keep';
    else if (offsetX < -threshold) action = 'trash';
    else if (offsetY > threshold && Math.abs(offsetX) < threshold) action = 'maybe';
    else if (offsetY < -threshold && Math.abs(offsetX) < threshold) action = 'back';

    if (action) {
      if (action === 'back') {
        onAction('back' as any);
        setOffsetX(0);
        setOffsetY(0);
        setStartX(null);
        setStartY(null);
        return;
      }

      setIsAnimating(true);
      // Animate out
      setOffsetX(action === 'keep' ? window.innerWidth : action === 'trash' ? -window.innerWidth : 0);
      setOffsetY(action === 'maybe' ? window.innerHeight : 0);
      
      setTimeout(() => {
        onAction(action as any);
        setOffsetX(0);
        setOffsetY(0);
        setIsAnimating(false);
      }, 5);
    } else {
      setOffsetX(0);
      setOffsetY(0);
    }
    setStartX(null);
    setStartY(null);
  };

  const rotation = offsetX * 0.05;
  
  // Overlays
  const keepOpacity = Math.max(0, offsetX / 150);
  const trashOpacity = Math.max(0, -offsetX / 150);
  const maybeOpacity = Math.max(0, offsetY / 150);
  const backOpacity = Math.max(0, -offsetY / 150);

  return (
    <div 
      className="relative w-full h-full overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <div 
        className={`w-full h-full absolute inset-0 flex items-center justify-center ${isAnimating ? 'transition-all duration-[3ms] ease-out' : ''}`}
        style={{ transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)` }}
      >
        {children}
        
        {/* Visual Feedback Overlays */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden transition-opacity" style={{ opacity: keepOpacity }}>
          <div className="w-full h-full bg-emerald-500/20 border-8 border-emerald-500 flex items-center justify-center">
            <div className="bg-emerald-500 text-white text-4xl sm:text-6xl font-bold px-8 py-4 rounded-full shadow-2xl tracking-widest">KEEP</div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden transition-opacity" style={{ opacity: trashOpacity }}>
          <div className="w-full h-full bg-red-500/20 border-8 border-red-500 flex items-center justify-center">
            <div className="bg-red-500 text-white text-4xl sm:text-6xl font-bold px-8 py-4 rounded-full shadow-2xl tracking-widest">TRASH</div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden transition-opacity" style={{ opacity: maybeOpacity }}>
          <div className="w-full h-full bg-zinc-500/20 border-8 border-zinc-500 flex items-center justify-center">
            <div className="bg-zinc-500 text-white text-4xl sm:text-6xl font-bold px-8 py-4 rounded-full shadow-2xl tracking-widest">MAYBE</div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden transition-opacity" style={{ opacity: backOpacity }}>
          <div className="w-full h-full bg-indigo-500/20 border-8 border-indigo-500 flex items-center justify-center">
            <div className="bg-indigo-500 text-white text-4xl sm:text-6xl font-bold px-8 py-4 rounded-full shadow-2xl tracking-widest">BACK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
