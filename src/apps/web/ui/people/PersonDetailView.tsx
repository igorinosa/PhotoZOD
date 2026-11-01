import React, { useState, useMemo, useEffect } from 'react';
import { User, ChevronLeft, Edit2, Check, X, Trash2, UserPlus, MoreVertical, Lock, Unlock, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { PersonEntity, Face, ImportedAsset } from '../../../../shared/types';
import { faceStore } from '../../../../core/face/faceStore';
import { assetStore } from '../../../../core/dam/assetStore';
import { faceIndex } from '../../../../core/face/faceIndex';
import { renameEntity, removeFaceFromEntity, moveFaceToEntity, createNewPersonFromFace, getMergeSuggestions, checkSplitNeeded, togglePersonLock, setCoverFace } from '../../../../core/face/faceEntityEngine';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImage } from '../components/SmartImage';

interface PersonDetailViewProps {
  person: PersonEntity;
  onBack: () => void;
  onRename: (newName: string) => Promise<void>;
  allPeople: PersonEntity[];
  onSelectAsset?: (assetId: string) => void;
}

export const PersonDetailView: React.FC<PersonDetailViewProps> = ({ 
  person, 
  onBack, 
  onRename,
  allPeople,
  onSelectAsset
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(person?.name || '');
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [selectedFaceIds, setSelectedFaceIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<{entityId: string, score: number}[]>([]);
  const [needsSplit, setNeedsSplit] = useState(false);

  useEffect(() => {
    const checkQuality = async () => {
      const suggestions = await getMergeSuggestions(person?.id);
      setMergeSuggestions(suggestions);
      
      const split = await checkSplitNeeded(person?.id);
      setNeedsSplit(split);
    };
    checkQuality();
  }, [person?.id, person?.faceIds?.length]);

  const [visibleFacesCount, setVisibleFacesCount] = useState(30);
  const [visibleAssetsCount, setVisibleAssetsCount] = useState(30);

  // Fetch data
  const faces = useMemo(() => {
    const f = faceStore.getFacesByPerson(person?.id);
    console.log(`[PersonDetailView] Faces for ${person?.id}:`, f.length);
    // Filter by confidence
    return showLowConfidence ? f : f.filter(face => face.confidence >= 0.7);
  }, [person?.id, showLowConfidence]);

  const assets = useMemo(() => {
    const assetIds = Array.from(new Set(faces.map(f => faceIndex.getAssetForFace(f.id)).filter((id): id is string => !!id)));
    const a = assetStore.getAssetsByIds(assetIds);
    console.log(`[PersonDetailView] Assets for ${person?.id}:`, a.length);
    return a;
  }, [faces, person?.id]);

  // Reset visible counts when person changes
  useEffect(() => {
    setVisibleFacesCount(30);
    setVisibleAssetsCount(30);
  }, [person?.id]);

  const handleRenameSubmit = async () => {
    if (newName.trim() && newName !== person?.name) {
      await onRename(newName.trim());
    }
    setIsRenaming(false);
  };

  const toggleFaceSelection = (faceId: string) => {
    const next = new Set(selectedFaceIds);
    if (next.has(faceId)) {
      next.delete(faceId);
    } else {
      next.add(faceId);
    }
    setSelectedFaceIds(next);
    if (next.size === 0) setIsSelectionMode(false);
    else setIsSelectionMode(true);
  };

  const handleRemoveFaces = async () => {
    if (confirm(`Remove ${selectedFaceIds.size} faces from this person?`)) {
      for (const faceId of selectedFaceIds) {
        await removeFaceFromEntity(person?.id, faceId);
      }
      setSelectedFaceIds(new Set());
      setIsSelectionMode(false);
      // We might need to trigger a refresh here, but since we're using stores 
      // that might not be reactive, we rely on the parent or local state.
      // For now, let's assume the stores are updated and we just need to re-render.
    }
  };

  const handleMoveFaces = async (targetPersonId: string) => {
    for (const faceId of selectedFaceIds) {
      await moveFaceToEntity(faceId, person.id, targetPersonId);
    }
    setSelectedFaceIds(new Set());
    setIsSelectionMode(false);
  };

  const handleCreateNewPerson = async () => {
    for (const faceId of selectedFaceIds) {
      await createNewPersonFromFace(faceId, person.id);
    }
    setSelectedFaceIds(new Set());
    setIsSelectionMode(false);
  };

  const renderFaceThumbnail = (face: Face, asset: ImportedAsset, size: number = 120) => {
    const { x, y, width, height } = face.bbox;
    return (
      <div 
        className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${selectedFaceIds.has(face.id) ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-transparent hover:border-zinc-600'}`}
        style={{ width: size, height: size }}
        onClick={() => toggleFaceSelection(face.id)}
      >
        <SmartImage 
          src={asset?.thumbnailUrl} 
          assetId={asset?.assetId}
          alt={asset?.fileName || "Face"}
          className="w-full h-full object-cover"
          style={{
            objectPosition: `${x + width/2}% ${y + height/2}%`,
            transform: 'scale(2.5)' // Zoom in on face
          }}
          retryCount={5}
        />
        {selectedFaceIds.has(face.id) && (
          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
            <Check className="text-white w-8 h-8" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <input 
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                className="bg-zinc-800 border border-indigo-500 rounded px-3 py-1 text-xl font-semibold focus:outline-none"
              />
              <button onClick={handleRenameSubmit} className="p-2 text-green-500 hover:bg-green-500/10 rounded">
                <Check className="w-5 h-5" />
              </button>
              <button onClick={() => setIsRenaming(false)} className="p-2 text-red-500 hover:bg-red-500/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold tracking-tight">
                {person?.name || 'Unnamed Person'}
              </h1>
              <button 
                onClick={() => setIsRenaming(true)}
                className="p-1.5 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-zinc-800 rounded text-zinc-400"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {isSelectionMode && (
          <div className="flex items-center gap-2 bg-indigo-600/20 px-4 py-2 rounded-full border border-indigo-500/30">
            <span className="text-sm font-medium mr-2">{selectedFaceIds.size} selected</span>
            {selectedFaceIds.size === 1 && (
              <button 
                onClick={async () => {
                  await setCoverFace(person.id, Array.from(selectedFaceIds)[0]);
                  setIsSelectionMode(false);
                  setSelectedFaceIds(new Set());
                }}
                className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded-full transition-colors"
                title="Set as cover photo"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={handleRemoveFaces}
              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-full transition-colors"
              title="Remove from this person"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleCreateNewPerson}
              className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded-full transition-colors"
              title="Create new person from these faces"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {!isSelectionMode && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer hover:text-zinc-200">
              <input 
                type="checkbox" 
                checked={showLowConfidence} 
                onChange={(e) => setShowLowConfidence(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
              />
              Show low confidence
            </label>
            <button
              onClick={() => togglePersonLock(person.id, !person?.isLocked)}
              className={`p-2 rounded-full transition-colors ${person?.isLocked ? 'bg-amber-500/20 text-amber-500' : 'hover:bg-zinc-800 text-zinc-400'}`}
              title={person?.isLocked ? "Unlock Identity" : "Lock Identity"}
            >
              {person?.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {needsSplit && (
          <div className="m-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-500">Possible Split Needed</h3>
              <p className="text-sm text-amber-500/80 mt-1">This person may contain multiple different people. Review the faces below and remove incorrect ones.</p>
            </div>
          </div>
        )}

        {mergeSuggestions.length > 0 && (
          <div className="m-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
            <h3 className="text-sm font-medium text-indigo-400 mb-3">Merge Suggestions</h3>
            <div className="flex flex-wrap gap-2">
              {mergeSuggestions.map(s => {
                const p = allPeople.find(x => x.id === s.entityId);
                if (!p) return null;
                return (
                  <button 
                    key={s.entityId}
                    onClick={() => {
                      // We would need a merge function here, but for now just log
                      console.log("Merge with", p?.name);
                    }}
                    className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Merge with {p?.name || 'Unnamed'} ({(s.score * 100).toFixed(0)}%)
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Face Thumbnails Section */}
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Detected Faces</h2>
          <div className="flex flex-wrap gap-4">
            {faces.slice(0, visibleFacesCount).map(face => {
              const asset = assetStore.get(faceIndex.getAssetForFace(face.id) || '') as ImportedAsset;
              if (!asset) return null;
              return (
                <div key={face.id} className="flex flex-col items-center gap-2">
                  {renderFaceThumbnail(face, asset)}
                </div>
              );
            })}
          </div>
          {faces.length > visibleFacesCount && (
            <button 
              onClick={() => setVisibleFacesCount(prev => prev + 30)}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              Load more faces
            </button>
          )}
        </div>

        {/* Photos Grid Section */}
        <div className="p-6">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Photos ({assets.length})</h2>
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <User className="w-16 h-16 mb-4 opacity-20" />
              <p>No photos linked to this person</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {assets.slice(0, visibleAssetsCount).map(asset => {
                  const face = asset.ai?.faces.find(f => f.entityId === person.id);
                  return (
                    <div 
                      key={asset.assetId}
                      className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 group cursor-pointer"
                      onMouseEnter={() => setHoveredAssetId(asset.assetId)}
                      onMouseLeave={() => setHoveredAssetId(null)}
                      onClick={() => onSelectAsset?.(asset.assetId)}
                    >
                      <SmartImage 
                        src={asset?.thumbnailUrl} 
                        assetId={asset?.assetId}
                        alt={asset?.fileName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        retryCount={5}
                      />
                      
                      {/* Face Overlay Debug */}
                      {face && (
                        <div 
                          className={`absolute border-2 border-indigo-500/50 rounded-lg pointer-events-none transition-opacity duration-300 ${hoveredAssetId === asset.assetId ? 'opacity-100' : 'opacity-0'}`}
                          style={{
                            left: `${face.bbox.x}%`,
                            top: `${face.bbox.y}%`,
                            width: `${face.bbox.width}%`,
                            height: `${face.bbox.height}%`
                          }}
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
              {assets.length > visibleAssetsCount && (
                <button 
                  onClick={() => setVisibleAssetsCount(prev => prev + 30)}
                  className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors w-full"
                >
                  Load more photos
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
