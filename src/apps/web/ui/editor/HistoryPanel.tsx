import React, { useState, useEffect } from 'react';
import { useVersionStore } from '../../../../core/versioning/versionStore';
import { historyGraph } from '../../../../core/versioning/historyGraph';
import { snapshotManager } from '../../../../core/versioning/snapshotManager';
import { Version } from '../../../../shared/types';
import { assetStore } from '../../../../core/dam/assetStore';
import { Undo, Redo, Camera, GitBranch, Clock, ChevronRight, ChevronDown } from 'lucide-react';

interface HistoryPanelProps {
  assetId: string;
  activeVersionId?: string;
  onVersionSelect: (versionId: string) => void;
}

const sessionVisitCounts = new Map<string, number>();

export default function HistoryPanel({ assetId, activeVersionId, onVersionSelect }: HistoryPanelProps) {
  const versionsMap = useVersionStore(state => state.versions);
  const [snapshotName, setSnapshotName] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [, setVisitTick] = useState(0);

  useEffect(() => {
    if (activeVersionId) {
      const count = (sessionVisitCounts.get(activeVersionId) || 0) + 1;
      sessionVisitCounts.set(activeVersionId, count);
      setVisitTick(t => t + 1);
    }
  }, [activeVersionId]);

  const allVersions = Object.values(versionsMap)
    .filter(v => v.assetId === assetId)
    .sort((a, b) => a.createdAt - b.createdAt); // oldest first for tree

  const activePathIds = new Set(historyGraph.getHistoryPath(assetId, activeVersionId || '').map(v => v.id));

  const handleUndo = () => {
    const newId = historyGraph.undo(assetId);
    if (newId) onVersionSelect(newId);
  };

  const handleRedo = () => {
    const newId = historyGraph.redo(assetId);
    if (newId) onVersionSelect(newId);
  };

  const handleCreateSnapshot = (vId?: string) => {
    const targetId = vId || activeVersionId;
    if (!targetId) return;
    
    const name = vId ? prompt('Enter snapshot name:') : snapshotName.trim();
    if (!name) return;
    
    snapshotManager.createSnapshot(targetId, name);
    setSnapshotName('');
    setIsCreatingSnapshot(false);
  };

  const handleSelectVersion = (id: string) => {
    const asset = assetStore.get(assetId);
    if (asset) {
      assetStore.update(assetId, { ...asset, activeVersionId: id });
      onVersionSelect(id);
    }
  };

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTree = (v: Version, depth: number) => {
    const children = allVersions.filter(child => child.parentVersionId === v.id);
    const isActive = activeVersionId === v.id;
    const isOnActivePath = activePathIds.has(v.id);
    const isSnapshot = v.isSnapshot;
    
    const showChildren = showAllBranches || isOnActivePath || expandedNodes.has(v.id);
    const visits = sessionVisitCounts.get(v.id) || 0;
    const suggestSnapshot = visits >= 3 && !isSnapshot && !allVersions.some(snap => snap.isSnapshot && snap.parentVersionId === v.id);

    let label = v.name || (v.delta && v.delta.length > 0 ? v.delta[0].type : 'Original');

    return (
      <div key={v.id} className="flex flex-col">
        <div className="flex items-center relative my-0.5 group">
          {depth > 0 && (
            <div 
              className="absolute border-l-2 border-b-2 border-zinc-700 rounded-bl"
              style={{ 
                left: `${(depth - 1) * 16 + 8}px`, 
                top: '-12px', 
                width: '16px', 
                height: '24px' 
              }}
            />
          )}
          
          <button
            onClick={() => handleSelectVersion(v.id)}
            className={`flex-1 text-left py-1.5 px-2 text-xs rounded-md transition-colors flex items-center justify-between z-10 ${
              isActive 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' 
                : isOnActivePath
                  ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500'
            }`}
            style={{ marginLeft: `${depth * 16}px` }}
          >
            <div className="flex items-center gap-2">
              {children.length > 0 && !showAllBranches && !isOnActivePath && (
                <div onClick={(e) => toggleNode(v.id, e)} className="p-0.5 hover:bg-zinc-700 rounded cursor-pointer">
                  {showChildren ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
              )}
              {isSnapshot ? <Camera className="w-3 h-3 text-pink-400" /> : <div className={`w-1.5 h-1.5 rounded-full ${isOnActivePath ? 'bg-indigo-400' : 'bg-zinc-600'}`} />}
              <span className="capitalize">{label}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {suggestSnapshot && (
                <span 
                  onClick={(e) => { e.stopPropagation(); handleCreateSnapshot(v.id); }}
                  className="hidden group-hover:inline-block text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded border border-pink-500/30 hover:bg-pink-500/40"
                >
                  Save?
                </span>
              )}
              {children.length > 1 && <GitBranch className="w-3 h-3 text-zinc-500" />}
            </div>
          </button>
        </div>
        {showChildren && children.map(c => renderTree(c, depth + 1))}
      </div>
    );
  };

  const rootVersions = allVersions.filter(v => !v.parentVersionId);
  const snapshots = allVersions.filter(v => v.isSnapshot);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-white">History</h3>
          <p className="text-xs text-zinc-400 mt-1">Non-destructive edit graph.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleUndo} className="p-1.5 text-zinc-400 hover:text-white rounded bg-zinc-800 hover:bg-zinc-700" title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} className="p-1.5 text-zinc-400 hover:text-white rounded bg-zinc-800 hover:bg-zinc-700" title="Redo">
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Snapshots Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Camera className="w-3 h-3" /> Snapshots
            </h4>
            <button 
              onClick={() => setIsCreatingSnapshot(!isCreatingSnapshot)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              + New
            </button>
          </div>

          {isCreatingSnapshot && (
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={snapshotName}
                onChange={e => setSnapshotName(e.target.value)}
                placeholder="Snapshot name..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateSnapshot()}
              />
              <button 
                onClick={() => handleCreateSnapshot()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs"
              >
                Save
              </button>
            </div>
          )}

          <div className="space-y-1">
            {snapshots.length === 0 && <p className="text-xs text-zinc-600 italic">No snapshots yet.</p>}
            {snapshots.map(v => (
              <button
                key={v.id}
                onClick={() => handleSelectVersion(v.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex justify-between items-center ${activeVersionId === v.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-zinc-300 hover:bg-zinc-800'}`}
              >
                <span>{v.name || 'Snapshot'}</span>
                {activeVersionId === v.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Edit History Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Edit Graph
            </h4>
            <button 
              onClick={() => setShowAllBranches(!showAllBranches)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              {showAllBranches ? 'Collapse Inactive' : 'Show All'}
            </button>
          </div>
          
          <div className="pt-2">
            {rootVersions.map(v => renderTree(v, 0))}
          </div>
        </div>

      </div>
    </div>
  );
}
