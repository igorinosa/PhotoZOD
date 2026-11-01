import React, { useState, useEffect } from 'react';
import { dedupEngine, DuplicateGroup } from '../../../../core/dedup/dedupEngine';
import { backgroundScanner } from '../../../../core/dedup/dedupManager';
import { assetStore } from '../../../../core/dam/assetStore';
import { Asset } from '../../../../core/dam/types';
import { importState } from '../../../../core/pipeline/import/importState';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Trash2, Star, X, Info, AlertTriangle } from 'lucide-react';
import { assetEventBus } from '../../../../core/events/assetEvents';
import { applyCullState, beginTransaction, commitTransaction } from '../../../../core/culling/bulkActions';
import { SmartImage } from '../components/SmartImage';

interface DuplicateViewProps {
  onClose: () => void;
}

/**
 * STAGE 7E.4 — UI: DUPLICATE VIEW
 * 
 * Exposes duplicates as visual groups with clear actions.
 */
export const DuplicateView: React.FC<DuplicateViewProps> = ({ onClose }) => {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selectedInGroups, setSelectedInGroups] = useState<Record<string, Set<string>>>({});
  const [ignoredGroups, setIgnoredGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);

  useEffect(() => {
    refreshGroups();
    const handleAssetChange = () => refreshGroups();
    const unsub1 = assetEventBus.subscribe('ASSET_UPDATED', handleAssetChange);
    const unsub2 = assetEventBus.subscribe('ASSET_DELETED', handleAssetChange);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const refreshGroups = () => {
    setLoading(true);
    const allGroups = dedupEngine.getDuplicateGroups();
    setGroups(allGroups);
    
    // Initialize selections with recommended assets
    const initialSelections: Record<string, Set<string>> = {};
    allGroups.forEach(group => {
      initialSelections[group.groupId] = new Set(group.recommendedAssetId ? [group.recommendedAssetId] : []);
    });
    setSelectedInGroups(initialSelections);
    setLoading(false);
  };

  const handleRebuild = async () => {
    setIsRebuilding(true);
    dedupEngine.rebuildGroups();
    await backgroundScanner.scan(true);
    refreshGroups();
    setIsRebuilding(false);
  };

  const toggleSelection = (groupId: string, assetId: string) => {
    setSelectedInGroups(prev => {
      const current = new Set(prev[groupId] || []);
      if (current.has(assetId)) {
        current.delete(assetId);
      } else {
        current.add(assetId);
      }
      return { ...prev, [groupId]: current };
    });
  };

  // PART 7E.6 — USER ACTIONS
  
  const handleKeepBest = (group: DuplicateGroup) => {
    if (!group.recommendedAssetId) return;
    
    const others = group.assetIds.filter(id => id !== group.recommendedAssetId);
    
    beginTransaction();
    applyCullState([group.recommendedAssetId], 'keep');
    applyCullState(others, 'trash');
    commitTransaction();
    
    // Remove group from view
    setGroups(prev => prev.filter(g => g.groupId !== group.groupId));
  };

  const handleKeepSelected = (group: DuplicateGroup) => {
    const selected = selectedInGroups[group.groupId];
    if (!selected || selected.size === 0) return;
    
    const others = group.assetIds.filter(id => !selected.has(id));
    
    beginTransaction();
    applyCullState(Array.from(selected), 'keep');
    applyCullState(others, 'trash');
    commitTransaction();
    
    setGroups(prev => prev.filter(g => g.groupId !== group.groupId));
  };

  const handleIgnoreGroup = (groupId: string) => {
    setIgnoredGroups(prev => new Set([...prev, groupId]));
  };

  const visibleGroups = groups.filter(g => !ignoredGroups.has(g.groupId));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Duplicate Management</h2>
          <p className="text-xs text-muted-foreground">
            We found {groups.length} groups of similar photos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${isRebuilding ? 'animate-spin' : ''}`} />
            {isRebuilding ? 'Scanning...' : 'Re-scan'}
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Close Duplicate View"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-medium">No Duplicates Found</h3>
            <p className="text-muted-foreground max-w-xs">
              Your library is clean! No visually similar photos were detected.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {visibleGroups.map((group) => (
              <motion.div 
                key={group.groupId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-accent/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded uppercase tracking-wider">
                      Group: {group.groupId.substring(0, 8)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {group.assetIds.length} similar photos
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => handleKeepBest(group)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Keep Best
                    </button>
                    <button 
                      onClick={() => handleKeepSelected(group)}
                      disabled={!selectedInGroups[group.groupId] || selectedInGroups[group.groupId].size === 0}
                      className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Keep Selected
                    </button>
                    <button 
                      onClick={() => handleIgnoreGroup(group.groupId)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-border text-xs font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Ignore
                    </button>
                  </div>
                </div>

                {/* Group Assets */}
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {group.assetIds.map(assetId => {
                      const asset = assetStore.get(assetId);
                      if (!asset) return null;
                      
                      const importedAsset = importState.assets.find(a => a.assetId === assetId);
                      const isSelected = selectedInGroups[group.groupId]?.has(assetId);
                      const isRecommended = group.recommendedAssetId === assetId;

                      return (
                        <div 
                          key={assetId}
                          onClick={() => toggleSelection(group.groupId, assetId)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected ? 'border-primary' : 'border-transparent hover:border-accent'
                          }`}
                        >
                          <SmartImage 
                            src={importedAsset?.thumbnailUrl || asset.path} 
                            assetId={assetId}
                            alt={asset.fileName}
                            className="w-full h-full object-cover"
                            retryCount={5}
                          />
                          
                          {/* Selection Overlay */}
                          <div className={`absolute inset-0 bg-primary/20 flex items-center justify-center transition-opacity ${
                            isSelected ? 'opacity-100' : 'opacity-0'
                          }`}>
                            <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                              <Check className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Recommended Badge */}
                          {isRecommended && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              RECOMMENDED
                            </div>
                          )}

                          {/* Info Overlay on Hover */}
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                            <p className="text-[10px] text-white truncate">{asset.fileName}</p>
                            <p className="text-[10px] text-white/80">
                              {asset.width || '?'}x{asset.height || '?'} • {(asset.size / 1024 / 1024).toFixed(1)}MB
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Warning Footer if multiple selected */}
                {selectedInGroups[group.groupId]?.size > 1 && (
                  <div className="px-6 py-2 bg-yellow-500/10 border-t border-yellow-500/20 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-[10px] text-yellow-700 font-medium">
                      Multiple photos selected. All others will be moved to Trash.
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-accent/20 border-t border-border flex items-center gap-3">
        <Info className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Photos moved to Trash can be recovered from the Trash view. No photos are permanently deleted here.
        </p>
      </div>
    </div>

  );
};
