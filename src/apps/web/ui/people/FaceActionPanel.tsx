import React, { useState, useMemo } from 'react';
import { UserPlus, UserCheck, XCircle, Search, Check, X } from 'lucide-react';
import { Face, ImportedAsset, PersonEntity } from '../../../../shared/types';
import { assignFaceToEntity, createNewPersonFromFace, ignoreFace } from '../../../../core/face/faceEntityEngine';
import { motion, AnimatePresence } from 'motion/react';

interface FaceActionPanelProps {
  selectedFaces: { face: Face; asset: ImportedAsset }[];
  allPeople: PersonEntity[];
  onClose: () => void;
  onComplete: () => void;
}

export const FaceActionPanel: React.FC<FaceActionPanelProps> = ({
  selectedFaces,
  allPeople,
  onClose,
  onComplete
}) => {
  const [mode, setMode] = useState<'initial' | 'assign'>('initial');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return allPeople.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return allPeople.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 10);
  }, [allPeople, searchQuery]);

  const handleCreateNew = async () => {
    setIsProcessing(true);
    try {
      for (const { face } of selectedFaces) {
        await createNewPersonFromFace(face.id, null);
      }
      onComplete();
    } catch (err) {
      console.error('Failed to create new person:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssign = async (personId: string) => {
    setIsProcessing(true);
    try {
      for (const { face } of selectedFaces) {
        await assignFaceToEntity(face.id, personId);
      }
      onComplete();
    } catch (err) {
      console.error('Failed to assign faces:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIgnore = async () => {
    setIsProcessing(true);
    try {
      for (const { face } of selectedFaces) {
        await ignoreFace(face.id);
      }
      onComplete();
    } catch (err) {
      console.error('Failed to ignore faces:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h3 className="font-semibold text-zinc-100">
            {selectedFaces.length} {selectedFaces.length === 1 ? 'Face' : 'Faces'} Selected
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {mode === 'initial' ? (
              <motion.div 
                key="initial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 gap-2"
              >
                <button 
                  onClick={() => setMode('assign')}
                  disabled={isProcessing}
                  className="flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Assign to Existing Person</div>
                    <div className="text-xs text-zinc-500">Add these faces to someone you've already named</div>
                  </div>
                </button>

                <button 
                  onClick={handleCreateNew}
                  disabled={isProcessing}
                  className="flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Create New Person</div>
                    <div className="text-xs text-zinc-500">Start a new identity for these faces</div>
                  </div>
                </button>

                <button 
                  onClick={handleIgnore}
                  disabled={isProcessing}
                  className="flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Ignore Faces</div>
                    <div className="text-xs text-zinc-500">Hide these faces from suggestions and lists</div>
                  </div>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="assign"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    autoFocus
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
                  {filteredPeople.map(person => (
                    <button 
                      key={person.id}
                      onClick={() => handleAssign(person.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs">
                        {person?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{person?.name || 'Unnamed'}</div>
                        <div className="text-xs text-zinc-500">{person?.faceIds?.length} photos</div>
                      </div>
                    </button>
                  ))}
                  {filteredPeople.length === 0 && (
                    <div className="py-8 text-center text-zinc-500 text-sm">
                      No people found
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setMode('initial')}
                  className="text-sm text-zinc-400 hover:text-zinc-200 py-2"
                >
                  Back to options
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
