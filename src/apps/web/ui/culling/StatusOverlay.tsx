import { CullingStatus } from '../../../../core/dam/types';
import { Check, X, HelpCircle } from 'lucide-react';

export function StatusOverlay({ status }: { status: CullingStatus }) {
  if (status === 'unrated') return null;

  const colors = {
    keep: 'bg-emerald-500/80 text-white',
    trash: 'bg-red-500/80 text-white',
    maybe: 'bg-zinc-500/80 text-white'
  };

  const icons = {
    keep: <Check className="w-12 h-12" />,
    trash: <X className="w-12 h-12" />,
    maybe: <HelpCircle className="w-12 h-12" />
  };

  return (
    <div className="absolute top-4 right-4 pointer-events-none z-10">
      <div className={`p-3 rounded-full shadow-lg backdrop-blur-sm ${colors[status]}`}>
        {icons[status]}
      </div>
    </div>
  );
}
