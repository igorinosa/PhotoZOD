import React, { useState } from 'react';
import { useEntityState } from '../../state/entityState';
import { Merge, SplitSquareHorizontal, AlertTriangle, CheckCircle } from 'lucide-react';
import { mergeEntities } from '../../../../core/entities/merge';
import { splitEntity } from '../../../../core/entities/split';
import { entityManager } from '../../../../core/entities/entityManager';

export const EntityActions: React.FC = () => {
  const { selectedEntityIds, clearSelection } = useEntityState();
  const [isMerging, setIsMerging] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);

  const handleMerge = async () => {
    if (selectedEntityIds.length < 2) return;
    setIsMerging(true);
    try {
      // Merge all selected entities into the first one sequentially
      let targetId = selectedEntityIds[0];
      for (let i = 1; i < selectedEntityIds.length; i++) {
        const merged = await mergeEntities(targetId, selectedEntityIds[i]);
        targetId = merged.id;
      }
      clearSelection();
    } catch (err) {
      console.error('[EntityActions] Failed to merge:', err);
      console.error('Failed to merge entities.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleSplit = async () => {
    if (selectedEntityIds.length !== 1) return;
    setIsSplitting(true);
    try {
      const entityId = selectedEntityIds[0];
      const entity = await entityManager.get(entityId);
      if (!entity) throw new Error("Entity not found");
      
      // For testing, we split the first half of assets
      // In a real UI, the user would select which assets to split
      const half = Math.max(1, Math.floor(entity.assetIds.length / 2));
      const assetIdsToSplit = entity.assetIds.slice(0, half);
      
      await splitEntity(entityId, assetIdsToSplit);
      clearSelection();
    } catch (err) {
      console.error('[EntityActions] Failed to split:', err);
      console.error('Failed to split entity.');
    } finally {
      setIsSplitting(false);
    }
  };

  if (selectedEntityIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-200 w-[95%] sm:w-auto max-w-md overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
          {selectedEntityIds.length}
        </div>
        <span className="font-medium text-sm sm:text-base hidden sm:inline">Selected</span>
      </div>

      <div className="h-6 sm:h-8 w-px bg-slate-700 shrink-0" />

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {selectedEntityIds.length > 1 && (
          <button
            onClick={handleMerge}
            disabled={isMerging}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isMerging ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Merge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            )}
            Merge
          </button>
        )}

        {selectedEntityIds.length === 1 && (
          <button
            onClick={handleSplit}
            disabled={isSplitting}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSplitting ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <SplitSquareHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            )}
            Split
          </button>
        )}

        <button
          onClick={clearSelection}
          className="px-2 sm:px-4 py-1.5 sm:py-2 text-slate-400 hover:text-white text-xs sm:text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
