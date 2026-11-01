import React from 'react';
import { useBatchStore } from '../../../../core/versioning/batchStore';
import { useShallow } from 'zustand/react/shallow';
import { batchEngine } from '../../../../core/versioning/batchEngine';
import { Trash2, Unlink, Layers, Hash } from 'lucide-react';

interface BatchPanelProps {
  selectedAssetIds: Set<string>;
  onUnlinkSelected?: (batchId: string) => void;
}

export const BatchPanel: React.FC<BatchPanelProps> = ({ selectedAssetIds, onUnlinkSelected }) => {
  const batches = useBatchStore(useShallow(state => Object.values(state.batches)));
  
  if (batches.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-600 flex flex-col items-center justify-center h-full">
        <Layers className="mb-4 opacity-10" size={48} />
        <p className="text-sm font-medium">No Batch Edits</p>
        <p className="text-xs mt-1 opacity-60">Select assets and apply edits to create a batch.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 w-72">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Batch History</h3>
        </div>
        <span className="text-[10px] font-bold bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 border border-zinc-700">
          {batches.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {batches.map(batch => {
          const selectedInBatch = batch.assetIds.filter(id => selectedAssetIds.has(id));
          const hasSelection = selectedInBatch.length > 0;

          return (
            <div key={batch.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-all">
              <div className="p-3 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-xs font-bold text-zinc-100 truncate pr-2" title={batch.name}>
                    {batch.name}
                  </h4>
                  <div className="flex gap-1">
                    {hasSelection && (
                      <button 
                        onClick={() => onUnlinkSelected?.(batch.id)}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 rounded-lg transition-all"
                        title={`Unlink ${selectedInBatch.length} selected assets`}
                      >
                        <Unlink size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => batchEngine.deleteBatch(batch.id)}
                      className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                      title="Delete Batch"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Hash size={10} />
                    <span>{batch.assetIds.length} assets</span>
                  </div>
                  {hasSelection && (
                    <span className="text-indigo-400 font-medium">
                      • {selectedInBatch.length} selected
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-2 bg-zinc-950/30">
                <div className="space-y-1">
                  {batch.operations.map((op, idx) => (
                    <div key={idx} className="text-[10px] bg-zinc-900/80 border border-zinc-800/50 px-2 py-1.5 rounded-md text-zinc-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-indigo-500" />
                        <span className="capitalize font-medium">{op.type}</span>
                      </div>
                      <span className="text-zinc-500 font-mono">
                        {'value' in op ? (op.value > 0 ? `+${op.value}` : op.value) : ''}
                        {'angle' in op ? `${op.angle}°` : ''}
                        {'id' in op ? op.id : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
