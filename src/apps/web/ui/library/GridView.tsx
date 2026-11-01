import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { ImportedAsset, ImportProgress, FormatGroup, EditOperation } from '../../../../core/pipeline/import/importManagerTypes';
import { rebuildRegistry, RebuildProgress } from '../../../../core/pipeline/import/rebuildRegistry';
import { importState } from '../../../../core/pipeline/import/importState';
import { scanDirectory } from '../../../../core/pipeline/import/fileScanner';
import { searchAssets } from '../../../../core/dam/searchIndex';
import { parseSemanticQuery } from '../../../../core/search/semanticSearch';
import { useFaceProcessor } from '../../../../core/face/faceProcessor';
import { useShallow } from 'zustand/react/shallow';
import { getIndexManager } from '../../../../core/collections/indexManager';
import { countSatisfiedConditions } from '../../../../core/collections/evaluator';
import { RuleNode } from '../../../../core/collections/types';
import { assetStore } from '../../../../core/dam/assetStore';
import DetailView from './DetailView';
import { CullingView } from '../culling/CullingView';
import { SmartImage } from '../components/SmartImage';
import { 
  Shield, 
  Clock, 
  Star, 
  CheckCircle2, 
  Tag, 
  Palette, 
  X as XIcon, 
  Trash2, 
  Info, 
  HelpCircle, 
  ChevronRight, 
  Image as ImageIcon,
  LayoutGrid,
  Copy,
  Plus,
  Filter,
  FileCode,
  FileSearch,
  Zap,
  FolderSync,
  Search,
  Flag,
  Database,
  Layers
} from 'lucide-react';
import { DuplicateView } from './DuplicateView';
import { MaintenanceModal } from './MaintenanceModal';
import { RenameModal } from './RenameModal';
import { DateFixModal } from './DateFixModal';
import { CopyrightModal } from './CopyrightModal';
import { ScrubberModal } from './ScrubberModal';
import { MetadataTaggingView } from './MetadataTaggingView';
import StorageView from '../storage/StorageView';
import { PipelineControlBar } from '../components/PipelineControlBar';
import DeleteSafetyModal from '../components/DeleteSafetyModal';
import { useEditorStore } from '../../state/editorStore';
import { usePresetStore } from '../../../../core/state/presetStore';
import { useCollectionStore } from '../../state/collectionStore';
import { SmartCollectionsModal } from './SmartCollectionsModal';
import PeopleView from './PeopleView';
import { dedupEngine } from '../../../../core/dedup/dedupManager';
import { trashEngine } from '../../../../core/trash/trashEngine';
import { backupTracker } from '../../../../core/storage/backupTracker';
import { backupEngine } from '../../../../core/storage/backupEngine';
import { DuplicateMatch } from '../../../../core/dedup/dedupEngine';
import SearchBar from './SearchBar';
import { BatchPanel } from '../versioning/BatchPanel';
import { batchEngine } from '../../../../core/versioning/batchEngine';
import { useToastStore } from '../components/toastStore';
import { Users } from 'lucide-react';
import { Grid } from 'react-window';

// Custom hook to measure container
function useMeasure() {
  const [rect, setRect] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setRect({ width, height });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  return [ref, rect] as const;
}

const FORMAT_PRIORITY: Record<string, number> = {
  'raw': 100,
  'jpeg': 80,
  'png': 60,
  'heic': 40,
  'other': 20
};

const GridCell = React.memo(({ columnIndex, rowIndex, style, ...data }: any) => {
  try {
    const { 
      columnCount, 
      filteredAssets, 
      isGrouped, 
      groupCounts,
      isSelectionMode, 
      selectedAssetIds, 
      toggleAssetSelection, 
      setSelectedIndex 
    } = data;
    
    if (!filteredAssets) {
      return <div style={style} className="bg-red-500 text-white text-xs">Missing filteredAssets</div>;
    }
    
    const index = rowIndex * columnCount + columnIndex;
    const asset = filteredAssets[index];

    if (!asset) return null;

    const groupCount = groupCounts?.get(asset.groupId || asset.assetId) || 1;

    return (
      <div style={{
        ...style,
        padding: '8px',
      }}>
        <div 
          className={`bg-zinc-800 rounded-lg overflow-hidden flex flex-col cursor-pointer transition-all h-full relative group border border-indigo-500/10 ${
            selectedAssetIds?.has(asset.assetId) ? 'ring-4 ring-indigo-500 scale-[0.98]' : 'hover:ring-2 hover:ring-indigo-500'
          }`}
          onClick={() => {
            if (isSelectionMode) {
              toggleAssetSelection(asset.assetId);
            } else {
              setSelectedIndex(index);
            }
          }}
        >
          <SmartImage
            src={asset?.thumbnailUrl}
            assetId={asset?.assetId}
            alt={asset?.fileName || asset?.file?.name}
            className={`w-full h-3/4 object-cover bg-zinc-900 transition-opacity ${selectedAssetIds?.has(asset.assetId) ? 'opacity-50' : ''}`}
            retryCount={5}
          />
          
          {/* Selection Overlay */}
          {isSelectionMode && (
            <div className="absolute inset-0 z-20 flex items-start justify-start p-2">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedAssetIds?.has(asset.assetId) 
                  ? 'bg-indigo-500 border-indigo-400 shadow-lg' 
                  : 'bg-black/20 border-white/50 backdrop-blur-sm'
              }`}>
                {selectedAssetIds?.has(asset.assetId) && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </div>
          )}

          {/* Batch Indicator */}
          {asset.batchIds && asset.batchIds.length > 0 && (
            <div className="absolute top-2 right-2 z-20 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg border border-indigo-400/50 backdrop-blur-sm">
              <Layers size={10} />
              {asset.batchIds.length}
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 right-2 flex gap-1 items-center z-10">
            {asset.isTrashed && (
              <div className="bg-red-900/80 px-1.5 py-0.5 rounded-full shadow-lg backdrop-blur-sm border border-red-700/50 flex items-center gap-1">
                <Trash2 className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-bold text-red-200">Trashed</span>
              </div>
            )}
            {!asset.isTrashed && asset.pickStatus === 'picked' && (
              <div className="bg-zinc-900/80 p-1 rounded-full shadow-lg backdrop-blur-sm border border-zinc-700/50">
                <Flag className="w-3 h-3 text-white fill-white" />
              </div>
            )}
            {!asset.isTrashed && asset.pickStatus === 'rejected' && (
              <div className="bg-zinc-900/80 p-1 rounded-full shadow-lg backdrop-blur-sm border border-zinc-700/50">
                <XIcon className="w-3 h-3 text-zinc-400" />
              </div>
            )}
            {asset.rating && (
              <div className="bg-zinc-900/80 px-1 py-0.5 rounded-full shadow-lg backdrop-blur-sm border border-zinc-700/50 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-400">{asset.rating}</span>
              </div>
            )}
            {asset.colorTag && asset.colorTag !== 'none' && (
              <div 
                className="w-3 h-3 rounded-full shadow-md border border-white/20"
                style={{ backgroundColor: asset.colorTag === 'red' ? '#ef4444' : asset.colorTag === 'green' ? '#22c55e' : '#3b82f6' }}
              />
            )}
            {isGrouped && groupCount > 1 && (
              <div className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                {groupCount}
              </div>
            )}
          </div>

          <div className="p-2 h-1/4 text-xs text-zinc-300 flex flex-col justify-center">
            <span className="truncate">{asset.fileName || asset.file?.name}</span>
            <span className="text-zinc-500 truncate">{asset.metadata?.camera}</span>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in GridCell:", error);
    return <div style={style} className="bg-red-500/20 text-red-500 text-xs p-2">Error rendering cell</div>;
  }
});

const GridCellRenderer = (props: any) => {
  return <GridCell {...props} />;
};

const convertToEditOps = (ops: any[]): EditOperation[] => {
  return ops.map(op => {
    const type = op.type.toLowerCase();
    if (type === 'exposure') return { type: 'exposure', value: op.params.value || 0 };
    if (type === 'contrast') return { type: 'contrast', value: op.params.value || 0 };
    if (type === 'rotate') return { type: 'rotate', angle: op.params.value || 0 };
    if (type === 'filter') return { type: 'filter', id: op.params.value || '' };
    return null;
  }).filter(Boolean) as EditOperation[];
};

import { useImportQueue } from '../../../../core/dam/import/importQueue';

export default function GridView() {
  const [gridRef, gridRect] = useMeasure();
  const [assets, setAssets] = useState<ImportedAsset[]>(importState.assets);
  const [filteredAssets, setFilteredAssets] = useState<ImportedAsset[]>(importState.assets);
  const [groupCounts, setGroupCounts] = useState<Map<string, number>>(new Map());
  const [isGrouped, setIsGrouped] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [parsedRule, setParsedRule] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState<RebuildProgress | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCulling, setIsCulling] = useState(false);
  const [isDuplicateViewOpen, setIsDuplicateViewOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDateFixModalOpen, setIsDateFixModalOpen] = useState(false);
  const [isCopyrightModalOpen, setIsCopyrightModalOpen] = useState(false);
  const [isScrubberModalOpen, setIsScrubberModalOpen] = useState(false);
  const [isMetadataTaggingOpen, setIsMetadataTaggingOpen] = useState(false);
  const [isDamMenuOpen, setIsDamMenuOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isSmartCollectionsModalOpen, setIsSmartCollectionsModalOpen] = useState(false);
  const [isPeopleViewOpen, setIsPeopleViewOpen] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isStorageViewOpen, setIsStorageViewOpen] = useState(false);
  const [isBatchPanelOpen, setIsBatchPanelOpen] = useState(false);
  const { status: faceStatus, progress: faceProgress, current: faceCurrent, total: faceTotal } = useFaceProcessor(useShallow(state => ({
    status: state.status,
    progress: state.progress,
    current: state.current,
    total: state.total
  })));
  const [deleteSafetyData, setDeleteSafetyData] = useState<{ ids: string[] } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkTaggingActive, setIsBulkTaggingActive] = useState(false);
  const [showBulkWizard, setShowBulkWizard] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isTaggingModeSelectionOpen, setIsTaggingModeSelectionOpen] = useState(false);
  const [isBulkTaggingOpen, setIsBulkTaggingOpen] = useState(false);
  const [bulkKeywordInput, setBulkKeywordInput] = useState('');
  const [cullingMode, setCullingMode] = useState<'culling' | 'review_maybe' | 'review_trash'>('culling');
  const [cullingAssets, setCullingAssets] = useState<string[]>([]);
  const [reviewedCategories, setReviewedCategories] = useState<Set<'maybe' | 'trash'>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'keep' | 'maybe' | 'trash' | 'duplicates'>('all');
  const [formatFilter, setFormatFilter] = useState<FormatGroup[]>([]);

  // Persist formatFilter to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dam_format_filter');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFormatFilter(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved format filter', e);
      }
    }
  }, []);

  useEffect(() => {
    if (formatFilter.length > 0) {
      localStorage.setItem('dam_format_filter', JSON.stringify(formatFilter));
    } else {
      localStorage.removeItem('dam_format_filter');
    }
  }, [formatFilter]);

  const [detectedDuplicates, setDetectedDuplicates] = useState<DuplicateMatch[]>([]);
  const [autoMerge, setAutoMerge] = useState(true);
  const [showBatchPrompt, setShowBatchPrompt] = useState(false);
  const [showSingleEditPrompt, setShowSingleEditPrompt] = useState(false);
  const [batchInstruction, setBatchInstruction] = useState('');
  const [isGeneratingBatchEdit, setIsGeneratingBatchEdit] = useState(false);
  const [showSavePresetPrompt, setShowSavePresetPrompt] = useState(false);
  const [presetCodeToSave, setPresetCodeToSave] = useState('');
  const [presetName, setPresetName] = useState('');
  const presets = usePresetStore((state) => state.presets);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const addToast = useToastStore(state => state.addToast);
  const justImportedCountRef = useRef(0);

  const [advancedRule, setAdvancedRule] = useState<RuleNode | null>(null);
  const { collections, activeCollectionId, setActiveCollection, deleteCollection } = useCollectionStore(useShallow(state => ({
    collections: state.collections,
    activeCollectionId: state.activeCollectionId,
    setActiveCollection: state.setActiveCollection,
    deleteCollection: state.deleteCollection
  })));

  const smartCollections = collections.filter(c => c.isSmart);
  const userCollections = collections.filter(c => !c.isSmart);

  const getCollectionIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'picked photos': return <Flag className="w-4 h-4 text-emerald-400" />;
      case 'rejected photos': return <XIcon className="w-4 h-4 text-zinc-400" />;
      case 'kept photos': return <Star className="w-4 h-4 text-amber-400" />;
      case 'maybe': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'trash': return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'best shots': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'portraits': return <Plus className="w-4 h-4 text-purple-400" />;
      case 'recently imported': return <Clock className="w-4 h-4 text-green-400" />;
      case 'duplicates': return <Copy className="w-4 h-4 text-orange-400" />;
      default: return <LayoutGrid className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Keyboard shortcuts for Pick Flag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (selectedAssetIds.size > 0) {
        if (e.key === 'p' || e.key === 'P') {
          // Check if all selected are already picked
          const assets = Array.from(selectedAssetIds).map(id => assetStore.get(id)).filter(Boolean);
          const allPicked = assets.every(a => a?.pickStatus === 'picked');
          handleBulkPick(allPicked ? 'unflagged' : 'picked');
        } else if (e.key === 'x' || e.key === 'X') {
          // Check if all selected are already rejected
          const assets = Array.from(selectedAssetIds).map(id => assetStore.get(id)).filter(Boolean);
          const allRejected = assets.every(a => a?.pickStatus === 'rejected');
          handleBulkPick(allRejected ? 'unflagged' : 'rejected');
        } else if (e.key === 'u' || e.key === 'U') {
          handleBulkPick('unflagged');
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (activeCollectionId !== 'trash') {
            const ids = Array.from(selectedAssetIds);
            handleDeleteWithSafety(ids);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAssetIds]);

  // Search effect
  useEffect(() => {
    const performSearch = async () => {
      let result = assets;
      
      // Filter by active collection if any
      if (activeCollectionId) {
        const activeCollection = collections.find(c => c.id === activeCollectionId);
        if (activeCollection) {
          result = result.filter(a => activeCollection.results.includes(a.assetId));
        }
      }
      
      // Global trash filter: hide trashed items unless we are explicitly in the Trash collection or searching for trash
      const isSearchingTrash = searchQuery.toLowerCase().includes('trash') || searchQuery.toLowerCase().includes('deleted');
      if (activeCollectionId !== 'trash' && !isSearchingTrash) {
        result = result.filter(a => !a.isTrashed);
      }
      
      if (searchQuery.trim() || advancedRule || formatFilter.length > 0) {
        let rule = parsedRule;
        if (searchQuery.trim()) {
          rule = await parseSemanticQuery(searchQuery);
          setParsedRule(rule);
        } else {
          setParsedRule(null);
        }

        let formatRule: RuleNode | null = null;
        if (formatFilter.length > 0) {
          if (formatFilter.length === 1) {
            formatRule = { type: 'condition', field: 'formatGroup', operator: '=', value: formatFilter[0] };
          } else {
            formatRule = { 
              type: 'group', 
              operator: 'OR', 
              children: formatFilter.map(f => ({ 
                type: 'condition', 
                field: 'formatGroup', 
                operator: '=', 
                value: f 
              })) 
            };
          }
        }

        let combinedRule: RuleNode | null = null;
        const rulesToCombine = [rule, advancedRule, formatRule].filter(Boolean) as RuleNode[];
        
        if (rulesToCombine.length === 1) {
          combinedRule = rulesToCombine[0];
        } else if (rulesToCombine.length > 1) {
          combinedRule = { type: 'group', operator: 'AND', children: rulesToCombine };
        }

        if (combinedRule) {
          const indexManager = getIndexManager();
          if (indexManager) {
            const allIds = new Set(result.map(a => a.assetId));
            const { ids } = indexManager.query(combinedRule, allIds);
            result = result.filter(a => ids.has(a.assetId));
          } else {
            const matchedIds = await searchAssets(searchQuery);
            result = result.filter(a => matchedIds.includes(a.assetId));
          }
        } else if (searchQuery.trim()) {
          const matchedIds = await searchAssets(searchQuery);
          result = result.filter(a => matchedIds.includes(a.assetId));
        }
        
        // Result Ranking Layer
        result.sort((a, b) => {
          let rankA = 0;
          let rankB = 0;

          // 1. Exact Match Strength (real matchScore)
          if (combinedRule) {
            rankA += countSatisfiedConditions(combinedRule, a) * 10;
            rankB += countSatisfiedConditions(combinedRule, b) * 10;
          }

          // 1.5 Format Priority (only if multiple formats selected)
          if (formatFilter.length > 1) {
            rankA += (FORMAT_PRIORITY[a.formatGroup] || 0);
            rankB += (FORMAT_PRIORITY[b.formatGroup] || 0);
          }

          // 2. Rating
          if (a.rating) rankA += a.rating * 5;
          if (b.rating) rankB += b.rating * 5;

          // 3. Quality Score
          rankA += (a.qualityScore || 0) * 2;
          rankB += (b.qualityScore || 0) * 2;

          // 4. Recency (newer files get a slight boost)
          if (a.importedAt && b.importedAt) {
            if (a.importedAt > b.importedAt) rankA += 1;
            if (b.importedAt > a.importedAt) rankB += 1;
          }

          return rankB - rankA; // Higher rank first
        });
      } else {
        setParsedRule(null);
      }
      
      if (statusFilter === 'duplicates') {
        const groups = dedupEngine.getDuplicateGroups();
        const duplicateIds = new Set<string>();
        groups.forEach(g => g.assetIds.forEach(id => duplicateIds.add(id)));
        result = result.filter(a => duplicateIds.has(a.assetId));
      } else if (statusFilter === 'all') {
        result = result.filter(a => a.culling !== 'trash');
      } else {
        result = result.filter(a => a.culling === statusFilter);
      }

      if (isGrouped) {
        // Group by groupId
        const groups = new Map<string, ImportedAsset[]>();
        const counts = new Map<string, number>();
        
        result.forEach(a => {
          const gid = a.groupId || a.assetId;
          if (!groups.has(gid)) groups.set(gid, []);
          groups.get(gid)!.push(a);
          counts.set(gid, (counts.get(gid) || 0) + 1);
        });

        setGroupCounts(counts);
        // For each group, pick a representative (for now, just the first one)
        result = Array.from(groups.values()).map(group => group[0]);
      } else {
        setGroupCounts(new Map());
      }
      
      if (activeCollectionId === 'trash') {
        result.sort((a, b) => {
          const timeA = a.trashedAt || 0;
          const timeB = b.trashedAt || 0;
          return timeB - timeA;
        });
      }
      
      setFilteredAssets(result);
    };
    
    performSearch();
  }, [searchQuery, assets, statusFilter, formatFilter, isGrouped, activeCollectionId, collections]);

  const [importStats, setImportStats] = useState({ total: 0, processed: 0, failed: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  
  const { setPhotoCode } = useEditorStore();

  useEffect(() => {
    const unsubscribe = importState.subscribe(() => {
      setImportStats({
        total: importState.total,
        processed: importState.processed,
        failed: importState.failed
      });
      setImportProgress(importState.currentProgress);
      
      if (importState.total > 0 && importState.processed + importState.failed === importState.total) {
        setIsImporting(false);
        if (justImportedCountRef.current > 1) {
          setShowBatchPrompt(true);
          justImportedCountRef.current = 0;
        } else if (justImportedCountRef.current === 1) {
          setShowSingleEditPrompt(true);
          justImportedCountRef.current = 0;
        }
      } else if (importState.total > 0) {
        setIsImporting(true);
      }
      setAssets([...importState.assets]);
    });
    
    const unsubscribeAssets = importState.subscribeToAssets((asset) => {
      setAssets((prev) => {
        if (prev.some(a => a.assetId === asset.assetId)) {
          return prev;
        }
        return [...prev, asset];
      });
    });
    
    const unsubscribeAssetUpdates = importState.subscribeToAssetUpdates((updatedAsset) => {
      setAssets((prev) => prev.map(a => a.assetId === updatedAsset.assetId ? { ...a, ...updatedAsset } : a));
    });
    
    const unsubscribeBatchUpdates = importState.subscribeToBatchUpdates((updatedAssets) => {
      const updatedMap = new Map(updatedAssets.map(a => [a.assetId, a]));
      setAssets((prev) => prev.map(a => updatedMap.has(a.assetId) ? { ...a, ...updatedMap.get(a.assetId) } : a));
    });
    
    const unsubscribeAssetDeletes = importState.subscribeToAssetDeletes((assetId) => {
      setAssets((prev) => prev.filter(a => a.assetId !== assetId));
    });
    
    const unsubscribeAssetsReloaded = importState.subscribeToAssetsReloaded(() => {
      setAssets([...importState.assets]);
    });
    
    return () => {
      unsubscribe();
      unsubscribeAssets();
      unsubscribeAssetUpdates();
      unsubscribeBatchUpdates();
      unsubscribeAssetDeletes();
      unsubscribeAssetsReloaded();
    };
  }, []);

  const processFiles = async (files: FileList | File[]) => {
    setIsUploadModalOpen(false);
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportProgress(null);
    setImportErrors([]);
    importState.reset();
    
    const errors: string[] = [];
    let allFilesToProcess: File[] = [];

    // Pre-process files to handle ZIPs
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed')) {
        setImportProgress({ fileName: `Extracting ${file.name}...`, progress: 0, status: 'Extracting ZIP' });
        try {
          const zip = new JSZip();
          const contents = await zip.loadAsync(file);
          const allowedExts = ['jpg', 'jpeg', 'png', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'heic'];
          
          for (const [filename, fileData] of Object.entries(contents.files)) {
            if (!fileData.dir) {
              const ext = filename.split('.').pop()?.toLowerCase();
              if (ext && allowedExts.includes(ext)) {
                const blob = await fileData.async('blob');
                const extractedFile = new File([blob], filename.split('/').pop() || filename, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
                allFilesToProcess.push(extractedFile);
              }
            }
          }
        } catch (err) {
          console.error('Failed to extract ZIP:', err);
          errors.push(`Failed to extract ${file.name}`);
        }
      } else {
        // Filter out non-images from folder uploads
        const ext = file?.name?.split('.').pop()?.toLowerCase();
        const allowedExts = ['jpg', 'jpeg', 'png', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'heic'];
        if (ext && allowedExts.includes(ext)) {
          allFilesToProcess.push(file);
        }
      }
    }

    if (allFilesToProcess.length === 0) {
      setImportErrors([...errors, "No valid images found to upload."]);
      setIsImporting(false);
      return;
    }

    justImportedCountRef.current = allFilesToProcess.length;

    // Use the new import queue
    useImportQueue.getState().createJob(allFilesToProcess);
    
    setImportErrors(errors);
    
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  const handleFolderSelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          const files = await scanDirectory(dirHandle);
          await processFiles(files);
        } catch (err: any) {
          if (err?.name === 'SecurityError' || err?.message?.includes('Cross origin sub frames') || err?.message?.includes('user activation')) {
            console.warn('showDirectoryPicker blocked by iframe, falling back to input');
            folderInputRef.current?.click();
          } else if (err.name !== 'AbortError') {
            console.error('Folder selection failed:', err);
          }
        }
      } else {
        folderInputRef.current?.click();
      }
    } catch (err) {
      console.error('Folder selection failed:', err);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(event.target.files || []);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleRebuild = async () => {
    if (isRebuilding) return;
    setIsUploadModalOpen(false);
    setIsRebuilding(true);
    setRebuildProgress(null);
    
    try {
      await rebuildRegistry((progress) => {
        setRebuildProgress(progress);
      });
      // Refresh assets after rebuild
      setAssets([...importState.assets]);
    } catch (error) {
      console.error('[GridView] Rebuild failed:', error);
      setImportErrors(prev => [...prev, 'Registry rebuild failed. Check console for details.']);
    } finally {
      setIsRebuilding(false);
      setRebuildProgress(null);
    }
  };

  const handleBatchEditSubmit = async () => {
    if ((!batchInstruction.trim() && !selectedPresetId) || filteredAssets.length === 0) return;
    
    setIsGeneratingBatchEdit(true);
    
    try {
      const { zodDirector } = await import('../../../../core/ai/zodDirector');
      const { renderPipeline } = await import('../../../../core/pipeline/render/renderPipeline');
      
      let generatedCode = '';

      if (selectedPresetId) {
        const preset = presets.find(p => p.id === selectedPresetId);
        if (preset) {
          generatedCode = preset.code;
        }
      } else {
        // Use the first asset as a reference for ZOD
        const referenceAsset = filteredAssets[0];
        const res = await fetch(referenceAsset.previewUrl);
        const sourceBlob = await res.blob();
        
        // Generate PhotoCode using ZOD
        generatedCode = await zodDirector.analyzeAndGenerate(
          batchInstruction,
          sourceBlob,
          referenceAsset.metadata,
          ''
        );
      }
      
      if (!generatedCode) {
        setIsGeneratingBatchEdit(false);
        setShowBatchPrompt(false);
        return;
      }

      const ops = await renderPipeline.compilePhotoCode(generatedCode);
      
      if (ops.length === 0) {
        setIsGeneratingBatchEdit(false);
        setShowBatchPrompt(false);
        return;
      }

      // NEW: Use Batch Versioning System
      const targetAssetIds = isSelectionMode && selectedAssetIds.size > 0 
        ? Array.from(selectedAssetIds) 
        : filteredAssets.map(a => a.assetId);

      batchEngine.applyBatch(targetAssetIds, convertToEditOps(ops), selectedPresetId ? presets.find(p => p.id === selectedPresetId)?.name : batchInstruction);
      
      addToast(`Applied batch to ${targetAssetIds.length} assets`);
      
      setBatchInstruction('');
      setIsBatchPanelOpen(true);
      
      // Prompt to save preset only if we generated new code
      if (!selectedPresetId) {
        setPresetCodeToSave(generatedCode);
        setShowSavePresetPrompt(true);
      }
    } catch (err) {
      console.error("Batch edit failed", err);
      addToast("Batch edit failed");
    } finally {
      setIsGeneratingBatchEdit(false);
      setShowBatchPrompt(false);
    }
  };

  const handleUnlinkSelected = (batchId: string) => {
    const selectedInBatch = Array.from(selectedAssetIds);
    if (selectedInBatch.length === 0) return;
    
    batchEngine.unlinkAssets(batchId, selectedInBatch);
    addToast(`Unlinked ${selectedInBatch.length} assets from batch`);
  };

  const renderRulePreview = (rule: any): string => {
    if (!rule) return '';
    if (rule.type === 'condition') {
      let fieldName = rule.field;
      if (fieldName === 'ai.sceneType') fieldName = 'Scene';
      if (fieldName === 'ai.tags') fieldName = 'Tag';
      if (fieldName === 'ai.faces' || fieldName === 'ai.faces.length') fieldName = 'Faces';
      if (fieldName === 'qualityScore') fieldName = 'Quality';
      if (fieldName === 'importedAt') fieldName = 'Imported';
      if (fieldName === 'culling') fieldName = 'Status';
      if (fieldName === 'duplicateGroupId') fieldName = 'Duplicate';
      if (fieldName === 'colorTag') fieldName = 'Color';
      if (fieldName === 'rating') fieldName = 'Rating';
      
      let val = rule.value;
      if (rule.field === 'importedAt') {
        const days = Math.round((Date.now() - val) / (24 * 60 * 60 * 1000));
        if (days === 1) val = 'today';
        else if (days === 2) val = 'yesterday';
        else val = `last ${days} days`;
      }
      
      if (rule.field === 'colorTag') {
        const labels: Record<string, string> = {
          red: 'Urgent',
          green: 'Approved',
          blue: 'Client Selects',
          none: 'None'
        };
        val = labels[rule.value] || rule.value;
      }
      
      let op = rule.operator;
      if (op === 'length>') op = '>';
      
      return `${fieldName} ${op} ${val}`;
    }
    if (rule.type === 'group') {
      const children = rule.children.map((c: any) => renderRulePreview(c));
      if (rule.operator === 'OR') {
        return `(${children.join(` ${rule.operator} `)})`;
      }
      return children.join(` ${rule.operator} `);
    }
    return '';
  };

  const handleBulkTag = (tag: string) => {
    if (!tag.trim()) return;
    const normalized = tag.trim().toLowerCase();
    const updates = Array.from(selectedAssetIds).map(id => {
      const asset = assetStore.get(id);
      if (!asset) return null;
      const currentTags = asset.ai?.tags || [];
      if (currentTags.includes(normalized)) return null;
      return {
        assetId: id,
        updates: {
          ai: {
            ...asset.ai,
            tags: [...currentTags, normalized]
          }
        }
      };
    }).filter(u => u !== null) as { assetId: string, updates: Partial<ImportedAsset> }[];

    if (updates.length > 0) {
      assetStore.batchUpdate(updates);
    }
    setBulkKeywordInput('');
  };

  const handleBulkColor = (color: string | null) => {
    const updates = Array.from(selectedAssetIds).map(id => ({
      assetId: id,
      updates: { colorTag: color }
    }));
    assetStore.batchUpdate(updates);
  };

  const handleBulkRating = (rating: number | null) => {
    const updates = Array.from(selectedAssetIds).map(id => ({
      assetId: id,
      updates: { rating: rating as any }
    }));
    assetStore.batchUpdate(updates);
  };

  const handleBulkCulling = (status: 'keep' | 'maybe' | 'trash') => {
    const updates = Array.from(selectedAssetIds).map(id => ({
      assetId: id,
      updates: { culling: status }
    }));
    assetStore.batchUpdate(updates);
  };

  const handleBulkPick = (status: 'picked' | 'rejected' | 'unflagged') => {
    const updates = Array.from(selectedAssetIds).map(id => ({
      assetId: id,
      updates: { pickStatus: status }
    }));
    assetStore.batchUpdate(updates);
  };

  const handleDeleteWithSafety = (ids: string[]) => {
    const unbacked = ids.filter(id => {
      const asset = assetStore.get(id);
      return asset && backupTracker.getBackupState(asset) !== 'FULLY_BACKED_UP';
    });

    if (unbacked.length > 0) {
      setDeleteSafetyData({ ids });
    } else {
      executeDelete(ids);
    }
  };

  const executeDelete = (ids: string[]) => {
    trashEngine.moveToTrash(ids);
    addToast(`Moved ${ids.length} item${ids.length === 1 ? '' : 's'} to Trash`, {
      label: 'Undo',
      onClick: () => trashEngine.restoreFromTrash(ids)
    });
    setSelectedAssetIds(new Set());
    setDeleteSafetyData(null);
  };

  const getCommonMetadata = () => {
    if (selectedAssetIds.size === 0) return { tags: [], color: null, rating: null };
    
    const assets = Array.from(selectedAssetIds).map(id => assetStore.get(id)).filter(Boolean) as ImportedAsset[];
    if (assets.length === 0) return { tags: [], color: null, rating: null };

    const firstAssetTags = assets[0].ai?.tags || [];
    const commonTags = firstAssetTags.filter(tag => 
      assets.every(a => a.ai?.tags?.includes(tag))
    );

    const firstColor = assets[0].colorTag;
    const commonColor = assets.every(a => a.colorTag === firstColor) ? firstColor : 'mixed';

    const firstRating = assets[0].rating;
    const commonRating = assets.every(a => a.rating === firstRating) ? firstRating : 'mixed';

    return { tags: commonTags, color: commonColor, rating: commonRating };
  };

  const handleRemoveBulkTag = (tag: string) => {
    const updates = Array.from(selectedAssetIds).map(id => {
      const asset = assetStore.get(id);
      if (!asset) return null;
      const currentTags = asset.ai?.tags || [];
      if (!currentTags.includes(tag)) return null;
      return {
        assetId: id,
        updates: {
          ai: {
            ...asset.ai,
            tags: currentTags.filter(t => t !== tag)
          }
        }
      };
    }).filter(u => u !== null) as { assetId: string, updates: Partial<ImportedAsset> }[];

    if (updates.length > 0) {
      assetStore.batchUpdate(updates);
    }
  };

  const commonMetadata = getCommonMetadata();

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  return (
    <>
    <div className="flex-1 flex flex-row w-full h-full min-h-0 bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-zinc-800/50 bg-zinc-900/30 flex-col shrink-0 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Smart Collections</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => setActiveCollection(null)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group ${
                  activeCollectionId === null 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className={`w-4 h-4 ${activeCollectionId === null ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span className="text-sm font-bold">All Photos</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeCollectionId === null ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                  {assets.length}
                </span>
              </button>

              {smartCollections.map(collection => (
                <button
                  key={collection.id}
                  onClick={() => setActiveCollection(collection.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group ${
                    activeCollectionId === collection?.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={activeCollectionId === collection?.id ? 'text-white' : ''}>
                      {getCollectionIcon(collection?.name)}
                    </div>
                    <span className="text-sm font-bold truncate">{collection?.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeCollectionId === collection?.id ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                    {collection?.results?.length}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {userCollections.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Custom Collections</h3>
              <div className="space-y-1">
                {userCollections.map(collection => (
                  <div key={collection.id} className="group relative">
                    <button
                      onClick={() => setActiveCollection(collection.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                        activeCollectionId === collection?.id 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Filter className={`w-4 h-4 ${activeCollectionId === collection?.id ? 'text-white' : 'text-zinc-500'}`} />
                        <span className="text-sm font-bold truncate">{collection?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeCollectionId === collection?.id ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                          {collection?.results?.length}
                        </span>
                      </div>
                    </button>
                    {!collection.readonly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete collection "${collection?.name}"?`)) {
                            deleteCollection(collection?.id);
                          }
                        }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <button
            onClick={() => setIsSmartCollectionsModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-2xl text-zinc-300 hover:text-white transition-all group"
          >
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold">New Smart Collection</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 relative">
        {/* Mobile Quick Filter Chips */}
        <div className="lg:hidden px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveCollection(null)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCollectionId === null 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            All Photos
          </button>
          {smartCollections.map(collection => (
            <button
              key={collection.id}
              onClick={() => setActiveCollection(collection?.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeCollectionId === collection?.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {getCollectionIcon(collection?.name)}
              {collection?.name}
              <span className={`text-[10px] opacity-60 ${activeCollectionId === collection?.id ? 'text-white' : 'text-zinc-500'}`}>
                {collection?.results?.length}
              </span>
            </button>
          ))}
          <button
            onClick={() => setIsSmartCollectionsModalOpen(true)}
            className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-zinc-800 text-zinc-400 flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" />
            More
          </button>
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {isSelectionMode && !isBulkTaggingActive && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-2xl flex flex-col items-center gap-2"
            >
              <div className={`w-full p-3 backdrop-blur-xl border shadow-2xl rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300 ${
                selectedAssetIds.size > 0 
                  ? "bg-indigo-900/95 border-indigo-500/50 shadow-indigo-900/50" 
                  : "bg-zinc-800/95 border-zinc-600/50 shadow-zinc-900/50"
              }`}>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  {selectedAssetIds.size > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-inner">
                        {selectedAssetIds.size} selected
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedAssetIds(new Set());
                          setIsBulkTaggingActive(false);
                        }}
                        className="text-zinc-400 hover:text-white text-xs font-medium underline transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                      <div className="text-indigo-200 text-sm font-semibold tracking-wide">
                        Select photos to begin
                      </div>
                    </div>
                  )}
                  
                  {/* Mobile close button */}
                  <button 
                    onClick={() => {
                      setSelectedAssetIds(new Set());
                      setIsSelectionMode(false);
                      setIsBulkTaggingActive(false);
                    }}
                    className="sm:hidden text-zinc-500 hover:text-white p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <XIcon size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                  <button 
                    onClick={() => setShowBulkWizard(true)}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedAssetIds.size === 0 
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 animate-pulse" 
                        : "text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600/50"
                    }`}
                  >
                    <HelpCircle size={16} />
                    How to use
                  </button>
                  {selectedAssetIds.size > 0 && (
                    <>
                      {activeCollectionId === 'trash' ? (
                        <>
                          <button 
                            onClick={() => {
                              trashEngine.restoreFromTrash(Array.from(selectedAssetIds));
                              setSelectedAssetIds(new Set());
                            }}
                            className="shrink-0 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            Restore
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Permanently delete ${selectedAssetIds.size} photos? This cannot be undone.`)) {
                                trashEngine.permanentlyDelete(Array.from(selectedAssetIds));
                                setSelectedAssetIds(new Set());
                              }
                            }}
                            className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                          >
                            <Trash2 size={16} />
                            Delete Forever
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              const ids = Array.from(selectedAssetIds);
                              backupEngine.runBackup(ids, 'cloud'); // Default to cloud for quick backup
                              setIsStorageViewOpen(true);
                            }}
                            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                          >
                            <Shield size={16} />
                            Backup Selected ({selectedAssetIds.size})
                          </button>
                          <button 
                            onClick={() => setIsBulkTaggingActive(true)}
                            className="shrink-0 px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                          >
                            <Palette size={16} />
                            Apply Tags
                          </button>
                          <button 
                            onClick={() => handleDeleteWithSafety(Array.from(selectedAssetIds))}
                            className="shrink-0 px-4 py-2 bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {/* Desktop close button */}
                  <button 
                    onClick={() => {
                      setSelectedAssetIds(new Set());
                      setIsSelectionMode(false);
                      setIsBulkTaggingActive(false);
                    }}
                    className="hidden sm:flex shrink-0 text-zinc-500 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors ml-auto"
                  >
                    <XIcon size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Screen Bulk Tagging View */}
        <AnimatePresence>
          {isBulkTaggingActive && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col"
            >
              {/* Header */}
              <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-medium text-zinc-100">Bulk Tagging</h2>
                  <span className="text-sm text-zinc-500 ml-2">
                    {selectedAssetIds.size} photos selected
                  </span>
                </div>
                <button 
                  onClick={() => setIsBulkTaggingActive(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
                <div className="w-full max-w-3xl flex flex-col gap-8">
                  {/* Bulk Keywords */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Keywords</span>
                    <div className="flex flex-wrap gap-2 min-h-[32px]">
                      {commonMetadata.tags.length === 0 && (
                        <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest py-1">No common tags</span>
                      )}
                      {commonMetadata.tags.map(tag => (
                        <span 
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg text-xs font-bold uppercase tracking-wider group hover:bg-indigo-500/20 transition-all"
                        >
                          {tag}
                          <button 
                            onClick={() => handleRemoveBulkTag(tag)}
                            className="opacity-40 group-hover:opacity-100 hover:text-red-400 transition-colors"
                          >
                            <XIcon size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                        <Tag size={16} />
                      </div>
                      <input 
                        type="text"
                        placeholder="Add tag to all selected..."
                        value={bulkKeywordInput}
                        onChange={e => setBulkKeywordInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBulkTag(bulkKeywordInput)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-base text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 placeholder-zinc-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Bulk Colors */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Color Label</span>
                    <div className="flex items-center gap-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto no-scrollbar">
                      {[
                        { name: 'red', hex: '#ef4444', label: 'Urgent' },
                        { name: 'green', hex: '#22c55e', label: 'Approved' },
                        { name: 'blue', hex: '#3b82f6', label: 'Client' },
                        { name: 'none', hex: 'transparent', label: 'None' }
                      ].map(color => (
                        <button
                          key={color.name}
                          onClick={() => handleBulkColor(color.name === 'none' ? null : color.name)}
                          className={`group relative flex flex-col items-center gap-2 transition-all shrink-0 ${
                            (commonMetadata.color === color.name || (color.name === 'none' && commonMetadata.color === null))
                              ? 'scale-110' 
                              : 'hover:scale-105 active:scale-95'
                          }`}
                        >
                          <div 
                            className={`w-10 h-10 rounded-full border-2 transition-all ${
                              (commonMetadata.color === color.name || (color.name === 'none' && commonMetadata.color === null))
                                ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                                : 'border-transparent'
                            } ${color.name === 'none' ? 'bg-zinc-800 border-zinc-700 border-dashed' : ''}`}
                            style={{ backgroundColor: color.name !== 'none' ? color.hex : undefined }}
                          />
                          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                            (commonMetadata.color === color.name || (color.name === 'none' && commonMetadata.color === null))
                              ? 'text-white' 
                              : 'text-zinc-600 group-hover:text-zinc-400'
                          }`}>
                            {color.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bulk Ratings */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Star Rating</span>
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto no-scrollbar">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleBulkRating(star)}
                          className="p-2 hover:scale-125 active:scale-90 transition-all group shrink-0"
                        >
                          <Star className={`w-8 h-8 transition-all ${
                            typeof commonMetadata.rating === 'number' && commonMetadata.rating >= star 
                              ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]' 
                              : 'text-zinc-700 group-hover:text-zinc-500'
                          }`} />
                        </button>
                      ))}
                      <button
                        onClick={() => handleBulkRating(null)}
                        className={`p-2 ml-2 transition-all hover:scale-110 active:scale-90 shrink-0 ${
                          commonMetadata.rating === null 
                            ? 'text-indigo-400' 
                            : 'text-zinc-700 hover:text-white'
                        }`}
                        title="Clear Rating"
                      >
                        <XIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 text-center sm:text-left">
                  <Info size={16} className="text-zinc-400 shrink-0" />
                  <span>
                    {commonMetadata.color === 'mixed' || commonMetadata.rating === 'mixed' ? 
                      "Some selected assets have different metadata" : 
                      "Applying changes to all selected assets"}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      setSelectedAssetIds(new Set());
                      setIsBulkTaggingActive(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Apply Tags & Select Another Batch
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedAssetIds(new Set());
                      setIsSelectionMode(false);
                      setIsBulkTaggingActive(false);
                    }}
                    className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                  >
                    Apply Tags & Done
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative z-30 flex flex-col bg-zinc-900/95 backdrop-blur-xl shrink-0 shadow-2xl shadow-black/50 mx-2 mt-2 rounded-[2rem] border border-zinc-800/50">
          {/* Search and Filters Section */}
          <div className="w-full border-b border-zinc-800/50 pb-1 sm:pb-0">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              parsedRule={parsedRule}
              renderRulePreview={renderRulePreview}
              assets={assets}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              advancedRule={advancedRule}
              setAdvancedRule={setAdvancedRule}
              formatFilter={formatFilter}
              setFormatFilter={setFormatFilter}
              onOpenCollections={() => setIsSmartCollectionsModalOpen(true)}
            />
          </div>
          
          {/* Format Filter Chips - Desktop & Mobile */}
          <div className="flex items-center gap-2 px-4 sm:px-6 py-2 overflow-x-auto no-scrollbar border-b border-zinc-800/30 bg-zinc-900/20">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2 shrink-0 hidden sm:block">Formats</span>
            <button
              onClick={() => setFormatFilter([])}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap active:scale-95 ${
                formatFilter.length === 0 
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-sm shadow-indigo-500/10' 
                  : 'bg-zinc-800/20 border-zinc-700/20 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
              }`}
            >
              all
            </button>
            {['raw', 'jpeg', 'png', 'heic', 'other'].map((f) => {
              const isActive = formatFilter.includes(f as any);
              return (
                <button
                  key={f}
                  onClick={() => {
                    setFormatFilter(prev => {
                      if (prev.includes(f as any)) {
                        return prev.filter(item => item !== f);
                      } else {
                        return [...prev, f as any];
                      }
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                    isActive 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-sm shadow-indigo-500/10' 
                      : 'bg-zinc-800/20 border-zinc-700/20 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  {f}
                </button>
              );
            })}
          </div>
          
          {/* Trash Header */}
          {activeCollectionId === 'trash' && (
            <div className="flex items-center justify-between w-full bg-red-900/20 border-b border-red-900/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <span className="text-sm font-bold text-red-100">Trash ({filteredAssets.length} items)</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (filteredAssets.length === 0) {
                      alert("Trash is already empty.");
                      return;
                    }
                    if (confirm(`Permanently delete all ${filteredAssets.length} photos in the trash? This cannot be undone.`)) {
                      trashEngine.emptyTrash();
                    }
                  }} 
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Empty Trash
                </button>
              </div>
            </div>
          )}

          <PipelineControlBar />

          {/* Management Toolbar */}
          <div className="flex items-center justify-between px-1.5 py-2.5 sm:px-6 sm:py-4 bg-zinc-900/50 border-b border-zinc-800/80 mt-1 sm:mt-0">
            <div className="flex items-center gap-1 sm:gap-4 shrink-0">
              {/* DAM Menu Button */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsBatchPanelOpen(!isBatchPanelOpen)}
                  className={`p-2 rounded-xl transition-all border ${isBatchPanelOpen ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
                  title="Batch History"
                >
                  <Layers className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsDamMenuOpen(!isDamMenuOpen)}
                    className={`flex items-center px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 group ${
                      isDamMenuOpen 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)]' 
                        : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white shadow-lg shadow-black/20'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black tracking-tight">DAM</span>
                  </button>
                
              </div>
            </div>

              {/* Grouping Toggle */}
              <button
                onClick={() => setIsGrouped(!isGrouped)}
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                  isGrouped 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                    : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white shadow-lg shadow-black/20'
                }`}
                title={isGrouped ? "Show all versions" : "Group similar photos"}
              >
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

              {/* Maintenance Button */}
              <button
                onClick={() => setIsMaintenanceOpen(true)}
                className="p-2 sm:p-3 bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg shadow-black/20"
                title="System Maintenance"
              >
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-4 shrink-0">
              {/* Face Processing Status */}
              {faceStatus === 'running' && (
                <div className="hidden md:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    Faces: {faceCurrent}/{faceTotal}
                  </span>
                </div>
              )}
              {faceStatus === 'paused' && faceTotal > 0 && (
                <div className="hidden md:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Faces Paused ({faceTotal - faceCurrent} left)
                  </span>
                </div>
              )}

              {/* Selection Mode Toggle */}
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedAssetIds(new Set());
                }}
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                  isSelectionMode 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                    : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white shadow-lg shadow-black/20'
                }`}
                title="Selection Mode"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
              </button>

              {/* Upload Button */}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                disabled={isImporting}
                className="flex items-center gap-1 sm:gap-3 px-2.5 sm:px-8 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl sm:rounded-2xl transition-all duration-300 text-[10px] sm:text-sm font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(99,102,241,0.4)] active:scale-95 group shrink-0"
              >
                <div className="hidden sm:block p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <span className="hidden sm:inline">{isImporting ? 'Uploading...' : 'Upload Photos'}</span>
                <span className="sm:hidden">{isImporting ? '...' : 'Upload'}</span>
              </button>
            </div>
          </div>
        </div>

      {/* Hidden inputs */}
      <input
        type="file"
        multiple
        accept="image/*,.cr2,.cr3,.nef,.arw,.dng,.heic"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImport}
      />
      <input
        type="file"
        {...{ webkitdirectory: "", directory: "" }}
        multiple
        className="hidden"
        ref={folderInputRef}
        onChange={handleImport}
      />
      <input
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        ref={zipInputRef}
        onChange={handleImport}
      />

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-xl p-6 w-full max-w-lg flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Upload to Library</h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div 
              className={`border-2 border-dashed rounded-xl p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
                fileInputRef.current?.click();
              }}
            >
              <div className="bg-zinc-800 p-4 rounded-full mb-4 text-zinc-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <h4 className="text-lg font-medium text-zinc-200 mb-1">Drag and drop your photos here</h4>
              <p className="text-sm text-zinc-500">Supports JPG, PNG, RAW, HEIC, Folders, and ZIP files</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-zinc-800 flex-1"></div>
              <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider">Or browse</span>
              <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  fileInputRef.current?.click();
                }}
                className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 group"
              >
                <svg className="text-zinc-400 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Photos</span>
              </button>
              
              <button
                onClick={handleFolderSelect}
                className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 group"
              >
                <svg className="text-zinc-400 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Folder</span>
              </button>

              <button
                onClick={() => zipInputRef.current?.click()}
                className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 group"
              >
                <svg className="text-zinc-400 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V3h13l5 5z"></path><path d="M21 8h-5V3"></path><line x1="12" y1="12" x2="12" y2="18"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white">ZIP File</span>
              </button>
            </div>
            
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="w-full py-3 mt-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors sm:hidden"
            >
              Cancel
            </button>

            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Maintenance</h4>
              </div>
              <button
                onClick={handleRebuild}
                disabled={isRebuilding || isImporting}
                className="w-full flex items-center justify-between p-3 bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-md text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-200">Rebuild Asset Registry</p>
                    <p className="text-[10px] text-zinc-500">Fixes duplicates, hashes, and metadata</p>
                  </div>
                </div>
                <svg className="text-zinc-600 group-hover:text-zinc-400 transition-colors" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9-6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {isDuplicateViewOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md">
          <DuplicateView onClose={() => setIsDuplicateViewOpen(false)} />
        </div>
      )}

      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        assets={filteredAssets}
      />

      <DateFixModal
        isOpen={isDateFixModalOpen}
        onClose={() => setIsDateFixModalOpen(false)}
        assets={filteredAssets}
      />

      <CopyrightModal
        isOpen={isCopyrightModalOpen}
        onClose={() => setIsCopyrightModalOpen(false)}
        assets={filteredAssets}
      />

      <ScrubberModal
        isOpen={isScrubberModalOpen}
        onClose={() => setIsScrubberModalOpen(false)}
        assets={filteredAssets}
      />

      {isCulling ? (
        <CullingView 
          initialAssetIds={cullingAssets} 
          mode={cullingMode}
          onClose={() => {
            setIsCulling(false);
            setCullingMode('culling');
            const keptAssets = filteredAssets.filter(a => assetStore.get(a.assetId)?.culling === 'keep');
            if (keptAssets.length > 0) {
              setShowSingleEditPrompt(true);
            }
          }}
          onFinish={() => {
            setIsCulling(false);
            setCullingMode('culling');
            setReviewedCategories(new Set());
            
            // Remove non-keep assets from the library
            const keptAssets = assets.filter(a => assetStore.get(a.assetId)?.culling === 'keep');
            setAssets(keptAssets);
            setFilteredAssets(keptAssets);
            
            if (keptAssets.length > 0) {
              setShowSingleEditPrompt(true);
            }
          }}
          onReview={(status) => {
            setReviewedCategories(prev => new Set(prev).add(status));
            const assetsToReview = filteredAssets.filter(a => assetStore.get(a.assetId)?.culling === status);
            setCullingAssets(assetsToReview.map(a => a.assetId));
            setCullingMode(status === 'maybe' ? 'review_maybe' : 'review_trash');
            setIsCulling(true);
          }}
          reviewedCategories={Array.from(reviewedCategories)}
        />
      ) : null}

      <div className="flex-1 h-full min-h-0 overflow-hidden relative flex flex-col">
        {importErrors.length > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-red-900/80 border-b border-red-500/50 p-3 z-20 text-sm text-red-100 flex justify-between items-start">
            <div>
              <p className="font-semibold mb-1">Upload Errors:</p>
              <ul className="list-disc pl-5">
                {importErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
            <button onClick={() => setImportErrors([])} className="text-red-200 hover:text-white underline">Dismiss</button>
          </div>
        )}
        
        {/* Debug Info */}
        <div className="absolute bottom-0 right-0 bg-black/50 text-white text-xs p-1 z-50 pointer-events-none">
          Assets: {filteredAssets.length} | Errors: {importErrors.length} | Importing: {isImporting ? 'Yes' : 'No'}
        </div>
        
        {isImporting && importStats.total > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-indigo-600/20 border-b border-indigo-500/30 p-3 z-10 flex flex-col gap-2 backdrop-blur-md">
            <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-indigo-200 font-medium">
                  Importing {importStats.processed + importStats.failed} of {importStats.total}
                </span>
                {importProgress && (
                  <span className="text-indigo-300/70 truncate max-w-[300px]">
                    {importProgress.status}: {importProgress.fileName}
                  </span>
                )}
              </div>
              <span className="text-indigo-200 font-bold">
                {Math.round(((importStats.processed + importStats.failed) / importStats.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden border border-indigo-500/20">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                style={{ width: `${((importStats.processed + importStats.failed) / importStats.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {isRebuilding && rebuildProgress && (
          <div className="absolute top-0 left-0 right-0 bg-amber-600/20 border-b border-amber-500/30 p-3 z-10 flex flex-col gap-2 backdrop-blur-md">
            <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-amber-200 font-medium">
                  Rebuilding Registry: {rebuildProgress.processed} of {rebuildProgress.total}
                </span>
                <span className="text-amber-300/70 truncate max-w-[300px]">
                  {rebuildProgress.status}: {rebuildProgress.currentFile}
                </span>
              </div>
              <span className="text-amber-200 font-bold">
                {Math.round((rebuildProgress.processed / rebuildProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden border border-amber-500/20">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                style={{ width: `${(rebuildProgress.processed / rebuildProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        


        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {filteredAssets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center bg-zinc-950/30">
                <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-zinc-800 shadow-inner">
                  <ImageIcon className="w-10 h-10 text-zinc-700" />
                </div>
                <h3 className="text-xl font-bold text-zinc-200 mb-2">
                  {searchQuery ? 'No matching photos' : 'Your library is empty'}
                </h3>
                <p className="text-sm text-zinc-500 max-w-xs mb-8">
                  {searchQuery 
                    ? "We couldn't find any photos matching your current search criteria. Try adjusting your filters or keywords." 
                    : "Start by uploading some photos to your library. You can drag and drop folders or ZIP files directly."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Upload First Photos
                  </button>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-all border border-zinc-700"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
                        <div ref={gridRef} className="flex-1 h-full min-h-0 p-2 overflow-hidden relative">
                {gridRect.width > 0 && gridRect.height > 0 ? (() => {
                    const width = gridRect.width;
                    const height = gridRect.height;
                    const columnCount = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;
                    const columnWidth = width / columnCount;
                    const rowCount = Math.ceil(filteredAssets.length / columnCount);
                    
                    console.log(`[GridView] Rendering Grid: ${width}x${height}, columns: ${columnCount}, rows: ${rowCount}, assets: ${filteredAssets.length}`);
                    
                    return (
                      <Grid
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                        rowCount={rowCount}
                        rowHeight={columnWidth}
                        style={{ height, width }}
                        cellProps={{
                          columnCount,
                          filteredAssets,
                          isGrouped,
                          groupCounts,
                          isSelectionMode,
                          selectedAssetIds,
                          toggleAssetSelection,
                          setSelectedIndex,
                          assets
                        }}
                        className="custom-scrollbar"
                        cellComponent={GridCellRenderer}
                      />
                    );
                  })() : null}
              </div>
            )}
          </div>

          {/* Batch Panel Sidebar */}
          <AnimatePresence>
            {isBatchPanelOpen && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="h-full"
              >
                <BatchPanel 
                  selectedAssetIds={selectedAssetIds}
                  onUnlinkSelected={handleUnlinkSelected}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {selectedIndex !== null && filteredAssets[selectedIndex] && (
        <DetailView 
          asset={filteredAssets[selectedIndex]} 
          groupAssets={assets.filter(a => (a.groupId || a.assetId) === (filteredAssets[selectedIndex].groupId || filteredAssets[selectedIndex].assetId))}
          onClose={() => setSelectedIndex(null)}
          onNext={() => setSelectedIndex((prev) => prev !== null ? Math.min(prev + 1, filteredAssets.length - 1) : null)}
          onPrev={() => setSelectedIndex((prev) => prev !== null ? Math.max(prev - 1, 0) : null)}
          onSelectAsset={(asset) => {
            const idx = filteredAssets.findIndex(a => a.assetId === asset.assetId);
            if (idx !== -1) {
              setSelectedIndex(idx);
            } else {
              const newFiltered = [...filteredAssets];
              newFiltered[selectedIndex] = asset;
              setFilteredAssets(newFiltered);
            }
          }}
          onApplyBatch={async (code) => {
            try {
              const { renderPipeline } = await import('../../../../core/pipeline/render/renderPipeline');
              const ops = await renderPipeline.compilePhotoCode(code);
              
              if (ops.length === 0) return;

              // Apply batch to selected assets or all filtered assets
              const targetAssetIds = isSelectionMode && selectedAssetIds.size > 0 
                ? Array.from(selectedAssetIds) 
                : filteredAssets.map(a => a.assetId);

              batchEngine.applyBatch(targetAssetIds, convertToEditOps(ops), "Detail View Batch");
              
              addToast(`Applied batch to ${targetAssetIds.length} assets`);
              setIsBatchPanelOpen(true);
              setSelectedIndex(null);
            } catch (err) {
              console.error("Batch failed", err);
              addToast("Batch edit failed");
            }
          }}
        />
      )}

      {/* Batch Edit Prompt Modal */}
      {showBatchPrompt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-6 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-indigo-500/20 p-4 rounded-full text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Batch Edit Uploaded Photos</h3>
              <p className="text-sm text-zinc-400">
                Describe the edits you want to apply to all uploaded photos. ZOD AI will generate the edits and apply them automatically.
              </p>
            </div>
            
            <div className="relative">
              <textarea
                value={batchInstruction}
                onChange={(e) => {
                  setBatchInstruction(e.target.value);
                  if (e.target.value) setSelectedPresetId(null);
                }}
                disabled={isGeneratingBatchEdit || selectedPresetId !== null}
                placeholder="E.g., Make these photos look like they were taken and edited by a luxury wedding photographer..."
                className="w-full bg-zinc-950 text-zinc-300 text-sm p-3 rounded-lg border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none min-h-[100px] disabled:opacity-50"
              />
            </div>

            {presets.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Or use a saved preset</div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        if (selectedPresetId === preset.id) {
                          setSelectedPresetId(null);
                        } else {
                          setSelectedPresetId(preset.id);
                          setBatchInstruction('');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        selectedPresetId === preset.id 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {preset?.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setShowBatchPrompt(false);
                  setShowSingleEditPrompt(true);
                  setBatchInstruction('');
                  setSelectedPresetId(null);
                }}
                disabled={isGeneratingBatchEdit}
                className="flex-1 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                Skip for now
              </button>
              <button
                onClick={handleBatchEditSubmit}
                disabled={isGeneratingBatchEdit || (!batchInstruction.trim() && !selectedPresetId)}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGeneratingBatchEdit ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Apply Batch Edit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Edit Instructions Modal */}
      {showSingleEditPrompt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-6 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-green-500/20 p-4 rounded-full text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Upload Complete</h3>
              <p className="text-sm text-zinc-400">
                Click on any photo in the library to open it. From there, you can use the ZOD AI assistant or edit the Photocode directly to apply adjustments.
              </p>
            </div>
            <button
              onClick={() => setShowSingleEditPrompt(false)}
              className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePresetPrompt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-6 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-indigo-500/20 p-4 rounded-full text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Save as Preset?</h3>
              <p className="text-sm text-zinc-400">
                Your batch edit was applied successfully! Would you like to save these edits as a preset for future use?
              </p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="E.g., Luxury Wedding, Moody Portrait..."
                className="w-full bg-zinc-950 text-zinc-300 text-sm p-3 rounded-lg border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setShowSavePresetPrompt(false);
                  setPresetCodeToSave('');
                  setPresetName('');
                }}
                className="flex-1 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                No Thanks
              </button>
              <button
                onClick={() => {
                  if (presetName.trim() && presetCodeToSave) {
                    usePresetStore.getState().addPreset(presetName.trim(), presetCodeToSave);
                    setShowSavePresetPrompt(false);
                    setPresetCodeToSave('');
                    setPresetName('');
                  }
                }}
                disabled={!presetName.trim()}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      <MaintenanceModal 
        isOpen={isMaintenanceOpen} 
        onClose={() => setIsMaintenanceOpen(false)} 
      />

      {isSmartCollectionsModalOpen && (
        <SmartCollectionsModal onClose={() => setIsSmartCollectionsModalOpen(false)} />
      )}

      {isTaggingModeSelectionOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-8 w-full max-w-2xl flex flex-col gap-6 sm:gap-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">Metadata Tagging</h2>
              <p className="text-zinc-400">Choose your preferred tagging workflow</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Focus Tagging */}
              <button 
                onClick={() => {
                  setIsMetadataTaggingOpen(true);
                  setIsTaggingModeSelectionOpen(false);
                }}
                className="group relative flex flex-col items-center text-center p-8 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <Tag size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Focus Tagging</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Fullscreen, one-by-one workflow. Best for detailed tagging, ratings, and color labels with high-res previews.
                </p>
                <div className="mt-6 px-4 py-2 bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  SELECT FOCUS MODE
                </div>
              </button>

              {/* Bulk Tagging */}
              <button 
                onClick={() => {
                  setIsSelectionMode(true);
                  setIsTaggingModeSelectionOpen(false);
                }}
                className="group relative flex flex-col items-center text-center p-8 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Bulk Tagging</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Grid-based multi-select workflow. Best for applying the same keywords, ratings, or labels to many assets at once.
                </p>
                <div className="mt-6 px-4 py-2 bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  SELECT BULK MODE
                </div>
              </button>
            </div>

            <button 
              onClick={() => setIsTaggingModeSelectionOpen(false)}
              className="self-center text-zinc-500 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      {showBulkWizard && (
        <BulkWizard onClose={() => setShowBulkWizard(false)} />
      )}

      {isPeopleViewOpen && (
        <PeopleView 
          onClose={() => setIsPeopleViewOpen(false)}
          onSelectAsset={(assetId) => {
            const index = filteredAssets.findIndex(a => a.assetId === assetId);
            if (index !== -1) {
              setSelectedIndex(index);
              setIsPeopleViewOpen(false);
            }
          }}
        />
      )}

      {isMetadataTaggingOpen && (
        <MetadataTaggingView 
          assets={filteredAssets} 
          onClose={() => setIsMetadataTaggingOpen(false)} 
        />
      )}

      {isStorageViewOpen && (
        <StorageView onClose={() => setIsStorageViewOpen(false)} />
      )}

      <FormatFilterModal 
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        formatFilter={formatFilter}
        setFormatFilter={setFormatFilter}
      />

      <DeleteSafetyModal 
        isOpen={!!deleteSafetyData}
        unbackedCount={deleteSafetyData ? deleteSafetyData.ids.filter(id => {
          const asset = assetStore.get(id);
          return asset && backupTracker.getBackupState(asset) !== 'FULLY_BACKED_UP';
        }).length : 0}
        totalCount={deleteSafetyData?.ids.length || 0}
        onCancel={() => setDeleteSafetyData(null)}
        onDeleteAnyway={() => {
          if (deleteSafetyData) executeDelete(deleteSafetyData.ids);
        }}
        onBackupFirst={() => {
          setDeleteSafetyData(null);
          setIsStorageViewOpen(true);
        }}
      />
      </div>
    </div>
  </div>

    {/* DAM Menu Root Portal */}
    <AnimatePresence>
      {isDamMenuOpen && (
        <>
          <motion.div 
            key="dam-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsDamMenuOpen(false)} 
          />
          <motion.div 
            key="dam-menu"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[101] w-full sm:w-[420px] bg-zinc-950 sm:rounded-3xl rounded-t-3xl border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between shrink-0 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h2 className="text-lg font-black text-white tracking-tight uppercase">Digital Assets</h2>
              </div>
              <button 
                onClick={() => setIsDamMenuOpen(false)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              <div className="flex flex-col gap-1">
                {filteredAssets.length > 0 && (
                  <button
                    onClick={() => {
                      setCullingAssets(filteredAssets.map(a => a.assetId));
                      setCullingMode('culling');
                      setIsCulling(true);
                      setIsDamMenuOpen(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-zinc-800/50 rounded-xl flex items-center gap-3 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 shrink-0">
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-zinc-200 group-hover:text-white leading-tight">Culling</span>
                      <span className="text-[10px] text-zinc-500 leading-tight mt-0.5">Rapidly review and select your best shots using professional rating workflows.</span>
                    </div>
                  </button>
                )}
                
                {[
                  { 
                    label: "Batch Rename", 
                    desc: "Organize files systematically with custom naming patterns and sequence numbering.",
                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
                    action: () => setIsRenameModalOpen(true)
                  },
                  { 
                    label: "Duplicate Finder", 
                    desc: "Identify and clean up redundant assets to save storage and keep your library lean.",
                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>,
                    action: () => setIsDuplicateViewOpen(true)
                  },
                  { 
                    label: "Metadata Tagging", 
                    desc: "Apply keywords, star ratings, and color labels to make your assets searchable.",
                    icon: <Tag className="w-4 h-4" />,
                    action: () => setIsTaggingModeSelectionOpen(true)
                  },
                  { 
                    label: "Format Filter", 
                    desc: "Instantly isolate specific file types like RAW, JPEG, or PNG for specialized workflows.",
                    icon: <Filter className="w-4 h-4" />,
                    action: () => setIsFormatModalOpen(true)
                  },
                  { 
                    label: "Face Grouping", 
                    desc: "Leverage AI to automatically group and identify people across your entire collection.",
                    icon: <Users className="w-4 h-4" />,
                    action: () => setIsPeopleViewOpen(true)
                  },
                  { 
                    label: "Date & Time Fix", 
                    desc: "Correct metadata timestamps for photos taken across different time zones or cameras.",
                    icon: <Clock className="w-4 h-4" />,
                    action: () => setIsDateFixModalOpen(true)
                  },
                  { 
                    label: "Copyright Injector", 
                    desc: "Embed your legal ownership and contact info directly into every image's metadata.",
                    icon: <Shield className="w-4 h-4" />,
                    action: () => setIsCopyrightModalOpen(true)
                  },
                  { 
                    label: "Storage & Backup", 
                    desc: "Monitor your library footprint and ensure your assets are safely backed up.",
                    icon: <Database className="w-4 h-4" />,
                    action: () => setIsStorageViewOpen(true)
                  },
                  { 
                    label: "Smart Collections", 
                    desc: "Create automated folders that update themselves based on your specific metadata rules.",
                    icon: <Layers className="w-4 h-4" />,
                    action: () => setIsSmartCollectionsModalOpen(true)
                  },
                  { 
                    label: "Metadata Scrubber", 
                    desc: "Remove sensitive GPS and personal data before sharing photos on social media.",
                    icon: <Search className="w-4 h-4" />,
                    action: () => setIsScrubberModalOpen(true)
                  },
                  { 
                    label: "Library Maintenance", 
                    desc: "Optimize your database and repair broken links to keep the system running fast.",
                    icon: <Zap className="w-4 h-4" />,
                    action: () => setIsMaintenanceOpen(true)
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { item.action(); setIsDamMenuOpen(false); }}
                    className="w-full text-left p-2.5 hover:bg-zinc-800/50 rounded-xl flex items-center gap-3 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-zinc-200 group-hover:text-white leading-tight">{item.label}</span>
                      <span className="text-[10px] text-zinc-500 leading-tight mt-0.5">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </>
);
}

function BulkWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Select Multiple Assets",
      description: "Click on images in the grid to select them. You'll see a blue ring and a checkmark on selected items. On mobile, just tap the images you want to tag.",
      icon: <CheckCircle2 className="text-indigo-400" size={48} />
    },
    {
      title: "Apply Tags",
      description: "Once you've selected your assets, click the 'Apply Tags' button in the top bar to reveal the tagging tools.",
      icon: <Palette className="text-indigo-400" size={48} />
    },
    {
      title: "Keywords Tagging",
      description: "Type a keyword in the input box and press Enter to add it before typing another. These tags are searchable using the semantic search bar.",
      icon: <Tag className="text-indigo-400" size={48} />
    },
    {
      title: "Color Labels",
      description: "Assign color labels to categorize your assets: Red for Urgent, Green for Approved, and Blue for Client Selects/Favorite.",
      icon: <Palette className="text-indigo-400" size={48} />
    },
    {
      title: "Star Ratings",
      description: "Assign a 1-5 star rating to your photos by clicking the stars. Click the same star again to clear the rating.",
      icon: <Star className="text-indigo-400" size={48} />
    },
    {
      title: "Workflow Control",
      description: "Use 'Clear Selection' to clear your current selection and start tagging a new batch, or click 'Done' to finish your bulk tagging session.",
      icon: <ChevronRight className="text-indigo-400" size={48} />
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors z-10"
        >
          <XIcon size={20} />
        </button>

        <div className="p-10 flex flex-col items-center text-center gap-8">
          <div className="w-28 h-28 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner">
            {steps[step].icon}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-white tracking-tight">{steps[step].title}</h3>
            <p className="text-zinc-400 leading-relaxed font-medium">
              {steps[step].description}
            </p>
          </div>

          <div className="flex gap-2.5 mt-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-10 bg-indigo-500' : 'w-2 bg-zinc-800'}`} 
              />
            ))}
          </div>

          <div className="flex gap-4 w-full mt-4">
            {step > 0 && (
              <button 
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                Back
              </button>
            )}
            <button 
              onClick={() => {
                if (step < steps.length - 1) setStep(s => s + 1);
                else onClose();
              }}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
            >
              {step === steps.length - 1 ? "Got it!" : "Next"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FormatFilterModal({ 
  isOpen, 
  onClose, 
  formatFilter, 
  setFormatFilter 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  formatFilter: FormatGroup[]; 
  setFormatFilter: (filter: FormatGroup[]) => void;
}) {
  const formats: FormatGroup[] = ['raw', 'jpeg', 'png', 'heic', 'other'];
  
  const toggleFormat = (format: FormatGroup) => {
    if (formatFilter.includes(format)) {
      setFormatFilter(formatFilter.filter(f => f !== format));
    } else {
      setFormatFilter([...formatFilter, format]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Format Filter</h3>
              <p className="text-zinc-500 text-sm font-medium mt-1">Select one or more formats to filter your library</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <XIcon size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setFormatFilter([]); onClose(); }}
              className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-200 ${
                formatFilter.length === 0 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formatFilter.length === 0 ? 'bg-white/20' : 'bg-zinc-900'}`}>
                  <LayoutGrid size={20} />
                </div>
                <span className="font-bold">All Formats</span>
              </div>
              {formatFilter.length === 0 && <CheckCircle2 size={20} />}
            </button>

            {formats.map(format => (
              <button
                key={format}
                onClick={() => toggleFormat(format)}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-200 ${
                  formatFilter.includes(format)
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formatFilter.includes(format) ? 'bg-white/20' : 'bg-zinc-900'}`}>
                    <FileCode size={20} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-bold uppercase tracking-wider">{format}</span>
                    <span className="text-[10px] opacity-50 font-medium">
                      {format === 'raw' ? 'CR2, NEF, ARW, DNG...' : 
                       format === 'jpeg' ? 'Standard compressed images' :
                       format === 'png' ? 'Lossless web graphics' :
                       format === 'heic' ? 'High efficiency Apple format' : 'Other file types'}
                    </span>
                  </div>
                </div>
                {formatFilter.includes(format) && <CheckCircle2 size={20} />}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-zinc-200 transition-colors shadow-xl"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </div>
  );
}
