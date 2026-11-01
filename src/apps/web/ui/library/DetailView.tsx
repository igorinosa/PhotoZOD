import React, { useEffect, useState, useRef } from 'react';
import { ImportedAsset } from '../../../../core/pipeline/import/importManagerTypes';
import PhotoCodeEditor from '../editor/PhotoCodeEditor';
import ZodDirector from '../editor/ZodDirector';
import HistoryPanel from '../editor/HistoryPanel';
import { renderPipeline } from '../../../../core/pipeline/render/renderPipeline';
import { renderEngine } from '../../../../core/render/renderEngine';
import { exportEngine } from '../../../../core/pipeline/export/exportEngine';
import { useEditorStore } from '../../state/editorStore';
import { getZodContext } from '../../../../core/zod/context';
import { SemanticData } from '../../../../core/ai/vision/semanticBuilder';
import { usePresetStore } from '../../../../core/state/presetStore';
import { useBatchStore } from '../../../../core/versioning/batchStore';
import { assetStore } from '../../../../core/dam/assetStore';
import { trashEngine } from '../../../../core/trash/trashEngine';
import { useToastStore } from '../components/toastStore';
import { backupTracker } from '../../../../core/storage/backupTracker';
import { historyGraph } from '../../../../core/versioning/historyGraph';
import { snapshotManager } from '../../../../core/versioning/snapshotManager';
import { EditOperation } from '../../../../shared/types';
import DeleteSafetyModal from '../components/DeleteSafetyModal';
import { SmartImage } from '../components/SmartImage';
import { Download, X, Image as ImageIcon, Users, Zap, Save, Layers, Flag, X as XIcon, Trash2 } from 'lucide-react';

interface DetailViewProps {
  asset: ImportedAsset;
  groupAssets: ImportedAsset[];
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onApplyBatch: (code: string) => void;
  onSelectAsset: (asset: ImportedAsset) => void;
}

export default function DetailView({ asset, groupAssets, onClose, onNext, onPrev, onApplyBatch, onSelectAsset }: DetailViewProps) {
  const addToast = useToastStore(state => state.addToast);
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(asset.previewBlob);
  const [displayUrl, setDisplayUrl] = useState<string>(asset.previewUrl);
  const lastAssetId = useRef(asset.assetId);
  if (lastAssetId.current !== asset.assetId) {
    lastAssetId.current = asset.assetId;
    setDisplayUrl(asset.previewUrl);
  }
  const [activeTab, setActiveTab] = useState<'zod' | 'photocode' | 'presets' | 'variations' | 'history'>('zod');
  const [transientOps, setTransientOps] = useState<EditOperation[]>([]);
  const [semanticData, setSemanticData] = useState<SemanticData | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteSafety, setShowDeleteSafety] = useState(false);
  const { photocode: currentCode, setCurrentAsset, setPhotoCode } = useEditorStore();
  const presets = usePresetStore((state) => state.presets);
  const batches = useBatchStore(state => state.batches);

  // Re-render when version or batch changes
  const handleVersionSelect = async (versionId: string, ops: EditOperation[] = []) => {
    const url = await renderEngine.render(asset.assetId, versionId, ops);
    if (url) {
      setDisplayUrl(url);
    }
  };

  // Track batch updates for this asset
  const batchKey = (asset.batchIds || []).map(id => batches[id]?.updatedAt || 0).join(',');

  useEffect(() => {
    if (asset.activeVersionId) {
      handleVersionSelect(asset.activeVersionId, transientOps);
    }
  }, [asset.activeVersionId, transientOps, batchKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();

      // Pick Flag shortcuts
      if (e.key === 'p' || e.key === 'P') {
        const newStatus = asset.pickStatus === 'picked' ? 'unflagged' : 'picked';
        assetStore.update(asset.assetId, { pickStatus: newStatus });
      } else if (e.key === 'x' || e.key === 'X') {
        const newStatus = asset.pickStatus === 'rejected' ? 'unflagged' : 'rejected';
        assetStore.update(asset.assetId, { pickStatus: newStatus });
      } else if (e.key === 'u' || e.key === 'U') {
        assetStore.update(asset.assetId, { pickStatus: 'unflagged' });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const id = asset.assetId;
        const backupState = backupTracker.getBackupState(asset);
        if (backupState === 'NOT_BACKED_UP') {
          setShowDeleteSafety(true);
        } else {
          trashEngine.moveToTrash([id]);
          addToast('Moved to Trash', {
            label: 'Undo',
            onClick: () => trashEngine.restoreFromTrash([id])
          });
          onNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, asset.assetId]);

  // Update state when asset changes
  useEffect(() => {
    let isMounted = true;
    setDisplayUrl(asset.previewUrl);
    setCurrentAsset(asset);
    
    getZodContext(asset.assetId).then(data => {
      if (isMounted && data) setSemanticData(data);
    });
    
    if (asset.previewBlob) {
      setSourceBlob(asset.previewBlob);
    } else {
      // Fallback for older assets in memory before previewBlob was added
      setSourceBlob(null);
      fetch(asset.previewUrl)
        .then(res => res.blob())
        .then(blob => {
          if (isMounted) setSourceBlob(blob);
        })
        .catch(err => console.error("Failed to load source blob", err));
    }
    
    return () => {
      isMounted = false;
    };
  }, [asset, setCurrentAsset]);

  const handleRender = React.useCallback((resultBlob: Blob, code: string) => {
    if (!code.trim()) {
      setDisplayUrl(prev => {
        if (prev && prev !== asset.previewUrl) {
          URL.revokeObjectURL(prev);
        }
        return asset.previewUrl;
      });
      return;
    }

    const newUrl = URL.createObjectURL(resultBlob);
    setDisplayUrl(prev => {
      if (prev && prev !== asset.previewUrl) {
        URL.revokeObjectURL(prev);
      }
      return newUrl;
    });
  }, [asset.previewUrl]);

  const hasOperations = () => {
    return currentCode.trim().length > 0;
  };

  const handleExport = async () => {
    if (!sourceBlob) return;
    
    try {
      setIsExporting(true);
      
      let finalBlob = sourceBlob;
      
      // Use versioning engine if active version exists
      if (asset.activeVersionId) {
        const renderedBlob = await renderEngine.renderToBlob(asset.assetId, asset.activeVersionId);
        if (renderedBlob) {
          finalBlob = renderedBlob;
        }
      } else if (currentCode.trim()) {
        // Fallback to old photocode if no versioning but photocode exists
        finalBlob = await renderPipeline.render(currentCode, sourceBlob, asset.metadata, asset.assetId);
      }

      // Inject metadata
      const exportedBlob = await exportEngine.exportImage(finalBlob, asset.metadata);
      
      // Download
      const url = URL.createObjectURL(exportedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PhotoZOD_${asset.fileName || asset.file?.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export image.");
    } finally {
      setIsExporting(false);
    }
  };

  // Mobile Gestures
  const touchStartX = useRef(0);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pressTimer.current = setTimeout(() => {
      if (asset.activeVersionId) {
        const name = prompt('Enter snapshot name:');
        if (name) {
          snapshotManager.createSnapshot(asset.activeVersionId, name);
          addToast('Snapshot created');
        }
      }
    }, 600);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    
    if (diff > 50) {
      // Swipe right -> redo
      const newId = historyGraph.redo(asset.assetId);
      if (newId) {
        assetStore.update(asset.assetId, { activeVersionId: newId });
        handleVersionSelect(newId);
        addToast('Redo');
      }
    } else if (diff < -50) {
      // Swipe left -> undo
      const newId = historyGraph.undo(asset.assetId);
      if (newId) {
        assetStore.update(asset.assetId, { activeVersionId: newId });
        handleVersionSelect(newId);
        addToast('Undo');
      }
    }
  };

  const handleTouchMove = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-[100] flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center px-3 py-2 sm:px-4 sm:py-3 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-white text-xs sm:text-sm truncate">{asset.fileName || asset.file?.name}</span>
            <span className="text-[10px] text-zinc-500 hidden sm:inline truncate">{asset.metadata.camera} • {asset.metadata.lens} • ISO {asset.metadata.iso}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasOperations() && (
            <button
              onClick={() => onApplyBatch(currentCode)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              Apply All
            </button>
          )}
          <button 
            onClick={() => {
              const id = asset.assetId;
              const backupState = backupTracker.getBackupState(asset);
              if (backupState === 'NOT_BACKED_UP') {
                setShowDeleteSafety(true);
              } else {
                trashEngine.moveToTrash([id]);
                addToast('Moved to Trash', {
                  label: 'Undo',
                  onClick: () => trashEngine.restoreFromTrash([id])
                });
                onNext();
              }
            }}
            className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-lg transition-all border border-red-900/50 active:scale-95"
            title="Move to Trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all border border-zinc-700 active:scale-95 disabled:opacity-50"
            title="Export"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
          <button 
            onClick={onClose}
            className="hidden sm:flex p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-950 min-h-0">
        <div 
          className="flex-1 relative flex items-center justify-center bg-black overflow-hidden min-h-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          <SmartImage 
            key={`main-${asset.assetId}`}
            src={displayUrl} 
            assetId={asset.assetId}
            alt={asset.fileName || asset.file?.name}
            className="w-full h-full object-contain"
            retryCount={5}
            priority={true}
          />
          
          {/* Pick Flag Indicator */}
          {asset.pickStatus === 'picked' && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl z-20">
              <Flag className="w-6 h-6 text-white fill-white" />
            </div>
          )}
          {asset.pickStatus === 'rejected' && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl z-20">
              <XIcon className="w-6 h-6 text-zinc-400" />
            </div>
          )}
          
          <button 
            onClick={onPrev}
            className="absolute left-2 md:left-4 p-2 md:p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors z-10"
          >
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={onNext}
            className="absolute right-2 md:right-4 p-2 md:p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors z-10"
          >
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {sourceBlob && (
          <div className="flex flex-col w-full md:w-96 bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 shrink-0 h-[35vh] md:h-full overflow-hidden">
            <div className="flex border-b border-zinc-800 shrink-0 sticky top-0 bg-zinc-900 z-20 overflow-x-auto no-scrollbar">
              <button 
                className={`px-4 py-3 text-xs font-medium shrink-0 flex items-center justify-center gap-2 ${activeTab === 'zod' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                onClick={() => setActiveTab('zod')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                ZOD AI
              </button>
              <button 
                className={`px-4 py-3 text-xs font-medium shrink-0 ${activeTab === 'photocode' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                onClick={() => setActiveTab('photocode')}
              >
                PhotoCode
              </button>
              <button 
                className={`px-4 py-3 text-xs font-medium shrink-0 ${activeTab === 'presets' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                onClick={() => setActiveTab('presets')}
              >
                Presets
              </button>
              <button 
                className={`px-4 py-3 text-xs font-medium shrink-0 ${activeTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
              {groupAssets.length > 1 && (
                <button 
                  className={`px-4 py-3 text-xs font-medium shrink-0 ${activeTab === 'variations' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                  onClick={() => setActiveTab('variations')}
                >
                  Variations ({groupAssets.length})
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto md:overflow-hidden">
              <div className={`h-full ${activeTab === 'zod' ? 'block' : 'hidden'}`}>
                <ZodDirector 
                  sourceBlob={sourceBlob}
                  metadata={asset.metadata}
                  semanticData={semanticData}
                />
              </div>
              <div className={`h-full ${activeTab === 'photocode' ? 'block' : 'hidden'}`}>
                <PhotoCodeEditor 
                  imageId={asset.assetId}
                  metadata={asset.metadata}
                  sourceBlob={sourceBlob}
                  onRender={handleRender}
                />
              </div>
              <div className={`h-full ${activeTab === 'presets' ? 'flex flex-col' : 'hidden'}`}>
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                  <h3 className="text-sm font-semibold text-white">Saved Presets</h3>
                  <p className="text-xs text-zinc-400 mt-1">Apply your saved batch edits to this photo.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {presets.length === 0 ? (
                    <div className="text-center text-zinc-500 text-sm py-8">
                      No presets saved yet. Save a batch edit to create one.
                    </div>
                  ) : (
                    presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setPhotoCode(preset.code);
                          setActiveTab('photocode');
                        }}
                        className="w-full text-left p-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors group"
                      >
                        <div className="font-medium text-sm text-zinc-200 group-hover:text-white">{preset.name}</div>
                        <div className="text-xs text-zinc-500 mt-1 truncate">{preset.code.split('\n')[0]}...</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className={`h-full ${activeTab === 'history' ? 'block' : 'hidden'}`}>
                <HistoryPanel 
                  assetId={asset.assetId} 
                  activeVersionId={asset.activeVersionId}
                  onVersionSelect={handleVersionSelect} 
                />
              </div>
              <div className={`h-full ${activeTab === 'variations' ? 'flex flex-col' : 'hidden'}`}>
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                  <h3 className="text-sm font-semibold text-white">Photo Family</h3>
                  <p className="text-xs text-zinc-400 mt-1">Visually similar versions of this photo.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 content-start">
                  {groupAssets.map((v) => (
                    <button
                      key={v.assetId}
                      onClick={() => onSelectAsset(v)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${v.assetId === asset.assetId ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-zinc-800 hover:border-zinc-600'}`}
                    >
                    <SmartImage src={v?.thumbnailUrl} assetId={v?.assetId} className="w-full h-full object-cover" alt={v?.fileName || v?.file?.name} retryCount={3} />
                      {v.assetId === asset.assetId && (
                        <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                          <div className="bg-indigo-500 text-white p-1 rounded-full">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <DeleteSafetyModal 
        isOpen={showDeleteSafety}
        unbackedCount={1}
        totalCount={1}
        onCancel={() => setShowDeleteSafety(false)}
        onDeleteAnyway={() => {
          const id = asset.assetId;
          trashEngine.moveToTrash([id]);
          addToast('Moved to Trash', {
            label: 'Undo',
            onClick: () => trashEngine.restoreFromTrash([id])
          });
          setShowDeleteSafety(false);
          onNext();
        }}
        onBackupFirst={() => {
          setShowDeleteSafety(false);
          // In a real app, this might open the storage manager
          // For now, we'll just close and let them handle it
        }}
      />
    </div>
  );
}
