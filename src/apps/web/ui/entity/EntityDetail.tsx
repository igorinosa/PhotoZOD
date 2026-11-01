import React, { useState, useEffect, useCallback } from 'react';
import { SmartImage } from '../components/SmartImage';
import { entityManager } from '../../../../core/entities/entityManager';
import { Entity } from '../../../../core/entities/schema';
import { useEntityState } from '../../state/entityState';
import { entityEventBus } from '../../../../core/events/entityEvents';
import { Edit2, Tag, Check, X, Image as ImageIcon, History, RotateCcw } from 'lucide-react';
import { versioningSystem, revertEntity, EntityVersion } from '../../../../core/entities/versioning';

export const EntityDetail: React.FC = () => {
  const { selectedEntityIds } = useEntityState();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [versions, setVersions] = useState<EntityVersion[]>([]);
  const [isReverting, setIsReverting] = useState(false);

  const loadEntity = useCallback(async () => {
    if (selectedEntityIds.length === 1) {
      const e = await entityManager.get(selectedEntityIds[0]);
      if (e) {
        setEntity(e);
        setEditName(e.metadata?.name || 'Unknown');
        const v = await versioningSystem.getVersions(e.id);
        setVersions(v);
      }
    } else {
      setEntity(null);
      setVersions([]);
    }
  }, [selectedEntityIds]);

  useEffect(() => {
    loadEntity();
    const unsubUpdated = entityEventBus.subscribe('ENTITY_UPDATED', loadEntity);
    return () => unsubUpdated();
  }, [loadEntity]);

  const handleRename = async () => {
    if (!entity || !editName.trim()) return;
    try {
      const updated = {
        ...entity,
        metadata: { ...entity.metadata, name: editName.trim() }
      };
      await entityManager.update(updated);
      setIsEditingName(false);
    } catch (err) {
      console.error('[EntityDetail] Failed to rename:', err);
    }
  };

  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim() && entity) {
      try {
        const tags = entity.metadata?.tags || [];
        if (!tags.includes(newTag.trim())) {
          const updated = {
            ...entity,
            metadata: { ...entity.metadata, tags: [...tags, newTag.trim()] }
          };
          await entityManager.update(updated);
        }
        setNewTag('');
      } catch (err) {
        console.error('[EntityDetail] Failed to add tag:', err);
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!entity) return;
    try {
      const tags = entity.metadata?.tags || [];
      const updated = {
        ...entity,
        metadata: { ...entity.metadata, tags: tags.filter(t => t !== tagToRemove) }
      };
      await entityManager.update(updated);
    } catch (err) {
      console.error('[EntityDetail] Failed to remove tag:', err);
    }
  };

  const handleRevert = async (version: number) => {
    if (!entity) return;
    if (!confirm(`Are you sure you want to revert to version ${version}?`)) return;
    
    setIsReverting(true);
    try {
      await revertEntity(entity.id, version);
      await loadEntity();
    } catch (err) {
      console.error('[EntityDetail] Failed to revert:', err);
      console.error('Failed to revert entity.');
    } finally {
      setIsReverting(false);
    }
  };

  if (selectedEntityIds.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border-l border-slate-200">
        <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
        <p className="font-medium">Select an entity to view details</p>
      </div>
    );
  }

  if (selectedEntityIds.length > 1) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border-l border-slate-200">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
          {selectedEntityIds.length}
        </div>
        <p className="font-medium text-slate-600">Entities Selected</p>
        <p className="text-sm mt-2">Use bulk actions to edit multiple entities.</p>
      </div>
    );
  }

  if (!entity) return null;

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 overflow-y-auto w-full md:w-80 shrink-0">
      {/* Header / Thumbnail */}
      <div className="p-6 border-b border-slate-100 flex flex-col items-center">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg mb-4">
          {entity.thumbnails && entity.thumbnails.length > 0 ? (
            <SmartImage 
              src={entity.thumbnails[0]} 
              assetId={entity.appearances[0]?.assetId}
              alt={entity.metadata?.name || 'Unknown'}
              className="w-full h-full object-cover"
              retryCount={5}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}
        </div>

        {isEditingName ? (
          <div className="flex items-center gap-2 w-full">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="flex-1 px-3 py-1.5 text-lg font-bold text-center border border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button onClick={handleRename} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={() => setIsEditingName(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
            <h2 className="text-2xl font-bold text-slate-900">{entity.metadata?.name || 'Unknown'}</h2>
            <Edit2 className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </div>
        )}
        
        <p className="text-sm text-slate-500 mt-2 font-medium">
          {entity.appearances?.length || 0} Appearances
        </p>
      </div>

      {/* Tags */}
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Tag className="w-3 h-3" /> Tags
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {entity.metadata?.tags?.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 focus:outline-none">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add tag and press Enter..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleAddTag}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Versions */}
      {versions.length > 0 && (
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-3 h-3" /> History
          </h3>
          <div className="space-y-2">
            {versions.slice().reverse().map(v => (
              <div key={v.version} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <span className="font-medium text-slate-700">v{v.version}</span>
                  <span className="text-slate-500 ml-2 text-xs">{v.action}</span>
                </div>
                <button
                  onClick={() => handleRevert(v.version)}
                  disabled={isReverting}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
                  title="Revert to this version"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col min-h-0">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Recent Appearances
        </h3>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
          {/* We'll just show placeholders for now, actual images need asset loading */}
          {entity.appearances?.slice(0, 20).map((app, i) => (
            <div key={`${app.assetId}-${i}`} className="h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
               <span className="text-xs font-mono text-slate-400 opacity-50">Asset {app.assetId.slice(0, 8)}</span>
            </div>
          ))}
          {(entity.appearances?.length || 0) > 20 && (
            <div className="py-4 text-center text-xs font-medium text-slate-400">
              + {(entity.appearances?.length || 0) - 20} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
