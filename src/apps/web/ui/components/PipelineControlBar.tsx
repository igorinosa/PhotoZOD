import React from 'react';
import { useFaceProcessor } from '../../../../core/face/faceProcessor';
import { Play, Pause, Square, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const PipelineControlBar: React.FC = () => {
  const { status, current, total, pauseProcessing, resumeProcessing, stopProcessing } = useFaceProcessor();

  if (status === 'idle' || (status === 'completed' && total === 0)) {
    return null;
  }

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        {status === 'running' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
        {status === 'paused' && <Pause className="w-4 h-4 text-amber-400" />}
        {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
        
        <span className="text-zinc-300 font-medium">
          {status === 'running' && 'Processing Faces...'}
          {status === 'paused' && 'Processing Paused'}
          {status === 'completed' && 'Processing Complete'}
        </span>
        
        {total > 0 && (
          <span className="text-zinc-500">
            {current} / {total}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === 'running' && (
          <button 
            onClick={pauseProcessing}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 rounded transition-colors"
            title="Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        {status === 'paused' && (
          <button 
            onClick={resumeProcessing}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-green-400 rounded transition-colors"
            title="Resume"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
        {(status === 'running' || status === 'paused') && (
          <button 
            onClick={stopProcessing}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded transition-colors"
            title="Stop"
          >
            <Square className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
