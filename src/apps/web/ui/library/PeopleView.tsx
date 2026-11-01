import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  User, 
  Image as ImageIcon,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X as XIcon,
  RefreshCw,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { entityStore } from '../../../../core/entities/entityStore';
import { PersonEntity, Face, ImportedAsset } from '../../../../shared/types';
import { assetStore } from '../../../../core/dam/assetStore';
import { faceIndex } from '../../../../core/face/faceIndex';
import { faceStore } from '../../../../core/face/faceStore';
import { useFaceProcessor } from '../../../../core/face/faceProcessor';
import { renameEntity, mergeEntities } from '../../../../core/face/faceEntityEngine';
import { cosineSimilarity } from '../../../../core/face/faceMatcher';
import { PersonDetailView } from '../people/PersonDetailView';
import { PipelineControlBar } from '../components/PipelineControlBar';
import { SmartImage } from '../components/SmartImage';

import { useFaceSettings } from '../../../../core/face/faceSettings';
import { FaceActionPanel } from '../people/FaceActionPanel';

interface PeopleViewProps {
  onClose?: () => void;
  onSelectAsset?: (assetId: string) => void;
}

export default function PeopleView({ onClose, onSelectAsset }: PeopleViewProps) {
  const [entities, setEntities] = useState<PersonEntity[]>([]);
  const [unassignedFaces, setUnassignedFaces] = useState<{face: Face, asset: ImportedAsset}[]>([]);
  const [mergeSuggestions, setMergeSuggestions] = useState<{entityA: PersonEntity, entityB: PersonEntity, score: number}[]>([]);
  const [selectedUnassignedFaceIds, setSelectedUnassignedFaceIds] = useState<Set<string>>(new Set());
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const { dismissedMerges, dismissMerge } = useFaceSettings();
  const { reprocessAll, status, progress } = useFaceProcessor();

  const isDismissed = (idA: string, idB: string) => {
    const key = [idA, idB].sort().join('_');
    return dismissedMerges.includes(key);
  };

  const selectedUnassignedFaces = useMemo(() => {
    return unassignedFaces.filter(f => selectedUnassignedFaceIds.has(f.face.id));
  }, [unassignedFaces, selectedUnassignedFaceIds]);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    setIsLoading(true);
    try {
      const all = await entityStore.getAll();
      // Sort by photo count (desc)
      const sorted = all.sort((a, b) => b.faceIds.length - a.faceIds.length);
      setEntities(sorted);
      
      // Load unassigned faces
      const allAssets = assetStore.getAll();
      const unassigned: {face: Face, asset: ImportedAsset}[] = [];
      for (const asset of allAssets) {
        if (asset.ai?.faces) {
          for (const face of asset.ai.faces) {
            if (!face.entityId && !face.isIgnored) {
              unassigned.push({ face, asset: asset as ImportedAsset });
            }
          }
        }
      }
      unassigned.sort((a, b) => b.face.confidence - a.face.confidence);
      setUnassignedFaces(unassigned);
      
      // Compute merge suggestions globally
      const suggestions: {entityA: PersonEntity, entityB: PersonEntity, score: number}[] = [];
      const topEntities = sorted.slice(0, 50); // Check top 50
      for (let i = 0; i < topEntities.length; i++) {
        for (let j = i + 1; j < topEntities.length; j++) {
          if (topEntities[i].isLocked || topEntities[j].isLocked) continue;
          const score = cosineSimilarity(topEntities[i].embedding, topEntities[j].embedding);
          if (score > 0.85) {
            suggestions.push({ entityA: topEntities[i], entityB: topEntities[j], score });
          }
        }
      }
      setMergeSuggestions(suggestions.sort((a, b) => b.score - a.score));
    } catch (err) {
      console.error('Failed to load entities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(e => 
      (e.name?.toLowerCase().includes(query)) || 
      (e.id.toLowerCase().includes(query))
    );
  }, [entities, searchQuery]);

  const selectedEntity = useMemo(() => 
    entities.find(e => e.id === selectedEntityId), 
    [entities, selectedEntityId]
  );

  const handleRename = async (entityId: string, name: string) => {
    try {
      await renameEntity(entityId, name);
      await loadEntities();
      setIsRenaming(null);
    } catch (err) {
      console.error('Failed to rename entity:', err);
    }
  };

  const renderFaceThumbnail = (entity: PersonEntity, size: number = 64) => {
    if (!entity) return null;
    // Get the cover face or first face
    const faceId = entity.coverFaceId || entity.faceIds?.[0];
    const assetId = faceIndex.getAssetForFace(faceId);
    const asset = assetId ? assetStore.get(assetId) as ImportedAsset : null;
    const face = asset?.ai?.faces.find(f => f.id === faceId);

    if (!asset || !face) {
      return (
        <div 
          className="bg-zinc-800 rounded-full flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <User className="text-zinc-500" />
        </div>
      );
    }

    const { x, y, width, height } = face.bbox;

    return (
      <div 
        className="rounded-full overflow-hidden bg-zinc-800 border border-zinc-700"
        style={{ width: size, height: size }}
      >
        <SmartImage
          src={asset?.thumbnailUrl} 
          assetId={asset?.assetId}
          alt={asset?.fileName || "Face"}
          className="w-full h-full object-cover"
          style={{
            objectPosition: `${x + width/2}% ${y + height/2}%`,
            transform: 'scale(2.5)' // Zoom in on the face
          }}
          retryCount={5}
        />
      </div>
    );
  };

  if (isLoading && entities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-zinc-400">Loading people...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-zinc-950 overflow-hidden">
      <PipelineControlBar />
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Sidebar - List of People */}
        <div className={`
          ${selectedEntityId ? 'hidden md:flex' : 'flex'} 
          flex-col w-full md:w-80 lg:w-96 border-r border-zinc-800 bg-zinc-900/30
        `}>
          <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                  title="Close People View"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                People
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => reprocessAll()}
                disabled={status === 'running'}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors disabled:opacity-50"
                title="Reprocess all faces"
              >
                <RefreshCw className={`w-4 h-4 ${status === 'running' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {status === 'running' && (
            <div className="p-4 bg-indigo-500/10 border-b border-indigo-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-indigo-400">Processing faces...</span>
                <span className="text-xs text-indigo-400">{Math.round(progress * 100)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-300" 
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* First-Time UX: Guide user to name top clusters */}
          {filteredEntities.length > 0 && filteredEntities.some(e => !e.name) && !searchQuery && (
            <div className="p-4 bg-indigo-500/5 border-b border-indigo-500/10">
              <p className="text-xs text-indigo-400 font-medium mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Name your top people to improve search
              </p>
            </div>
          )}

          {/* Merge Suggestions */}
          {mergeSuggestions.filter(s => !isDismissed(s.entityA.id, s.entityB.id)).length > 0 && !searchQuery && (
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Merge Suggestions</h3>
              <div className="space-y-2">
                {mergeSuggestions.filter(s => !isDismissed(s.entityA.id, s.entityB.id)).slice(0, 3).map(suggestion => (
                  <div key={`${suggestion.entityA.id}-${suggestion.entityB.id}`} className="bg-zinc-800/50 rounded-lg p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderFaceThumbnail(suggestion.entityA, 32)}
                        <span className="text-sm text-zinc-400">and</span>
                        {renderFaceThumbnail(suggestion.entityB, 32)}
                      </div>
                      <span className="text-xs text-indigo-400 font-medium">{Math.round(suggestion.score * 100)}% match</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          await mergeEntities(suggestion.entityA.id, suggestion.entityB.id);
                          loadEntities();
                        }}
                        className="flex-1 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        Merge
                      </button>
                      <button 
                        onClick={() => {
                          dismissMerge(suggestion.entityA.id, suggestion.entityB.id);
                        }}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unknown People */}
          {unassignedFaces.length > 0 && !searchQuery && (
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Unknown People
                </h3>
                <span className="text-xs text-zinc-500">{unassignedFaces.length} faces</span>
              </div>
              <div className="flex overflow-x-auto pb-2 gap-2 snap-x">
                {unassignedFaces.slice(0, 20).map((item, i) => {
                  const isSelected = selectedUnassignedFaceIds.has(item.face.id);
                  return (
                    <button 
                      key={item.face.id}
                      onClick={() => {
                        const next = new Set(selectedUnassignedFaceIds);
                        if (next.has(item.face.id)) next.delete(item.face.id);
                        else next.add(item.face.id);
                        setSelectedUnassignedFaceIds(next);
                      }}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all snap-start ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <SmartImage 
                        src={item.asset?.thumbnailUrl} 
                        assetId={item.asset?.assetId}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${item.face.bbox.x + item.face.bbox.width/2}% ${item.face.bbox.y + item.face.bbox.height/2}%`,
                          transform: 'scale(2.5)'
                        }}
                        retryCount={5}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredEntities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 px-6 text-center">
              <User className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No people found</p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-indigo-500 hover:underline text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {filteredEntities.map(entity => (
                <button
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`
                    w-full flex items-center gap-4 p-4 transition-all hover:bg-zinc-800/50 text-left group
                    ${selectedEntityId === entity?.id ? 'bg-indigo-500/10 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}
                  `}
                >
                  {renderFaceThumbnail(entity, 48)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${entity?.name ? 'text-zinc-100' : 'text-zinc-400 italic'}`}>
                        {entity?.name || 'Unnamed Person'}
                      </h3>
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {entity?.faceIds?.length}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {entity?.id?.substring(0, 8)}...
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${selectedEntityId === entity?.id ? 'translate-x-1 text-indigo-500' : ''}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Person Detail */}
      <div className={`flex-1 flex-col min-w-0 bg-zinc-950 ${!selectedEntityId ? 'hidden md:flex' : 'flex'}`}>
        <AnimatePresence mode="wait">
          {selectedEntity ? (
            <motion.div 
              key={selectedEntity?.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <PersonDetailView 
                person={selectedEntity}
                onBack={() => setSelectedEntityId(null)}
                onRename={(name) => handleRename(selectedEntity?.id, name)}
                allPeople={entities}
                onSelectAsset={onSelectAsset}
              />
            </motion.div>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-zinc-500 p-8 text-center">
              <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-zinc-700" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">Select a person</h3>
              <p className="max-w-xs">
                Choose someone from the list to view all photos they appear in and manage their identity.
              </p>
              
              {entities.length === 0 && (
                <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl max-w-sm">
                  <AlertCircle className="w-8 h-8 text-indigo-500 mx-auto mb-4" />
                  <p className="text-sm mb-4">No faces have been detected yet. Would you like to scan your library?</p>
                  <button 
                    onClick={() => reprocessAll()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    Reprocess All Assets
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
        </div>
      </div>
      {/* Face Action Panel */}
      <AnimatePresence>
        {selectedUnassignedFaceIds.size > 0 && (
          <FaceActionPanel 
            selectedFaces={selectedUnassignedFaces}
            allPeople={entities}
            onClose={() => setSelectedUnassignedFaceIds(new Set())}
            onComplete={() => {
              setSelectedUnassignedFaceIds(new Set());
              loadEntities();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
