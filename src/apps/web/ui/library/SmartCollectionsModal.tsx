import React, { useState } from 'react';
import { useCollectionStore } from '../../state/collectionStore';
import { useShallow } from 'zustand/react/shallow';
import { LayoutGrid, Star, Trash2, Clock, Copy, Plus, X, HelpCircle, Filter, Zap, FolderSync, ChevronRight, Info, Flag, X as XIcon } from 'lucide-react';
import { RuleBuilder } from '../RuleBuilder';
import { motion, AnimatePresence } from 'motion/react';

interface SmartCollectionsModalProps {
  onClose: () => void;
}

export const SmartCollectionsModal: React.FC<SmartCollectionsModalProps> = ({ onClose }) => {
  const { 
    collections, 
    activeCollectionId, 
    setActiveCollection, 
    deleteCollection 
  } = useCollectionStore(useShallow(state => ({
    collections: state.collections,
    activeCollectionId: state.activeCollectionId,
    setActiveCollection: state.setActiveCollection,
    deleteCollection: state.deleteCollection
  })));
  
  const [isBuildingRule, setIsBuildingRule] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const smartCollections = collections.filter(c => c.isSmart);
  const userCollections = collections.filter(c => !c.isSmart);

  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'picked photos': return <Flag className="w-4 h-4 text-emerald-400" />;
      case 'rejected photos': return <XIcon className="w-4 h-4 text-zinc-400" />;
      case 'unflagged photos': return <Flag className="w-4 h-4 text-zinc-500 opacity-50" />;
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

  if (isBuildingRule) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
          <RuleBuilder onClose={() => setIsBuildingRule(false)} />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Filter className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Smart Collections</h2>
              <button 
                onClick={() => setShowWizard(!showWizard)}
                className={`flex items-center gap-1 px-2 py-1 ml-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${showWizard ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}
              >
                <HelpCircle className="w-3 h-3" />
                How it works
              </button>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {showWizard ? (
                <motion.div
                  key="wizard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 space-y-8"
                >
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">What are Smart Collections?</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Instead of manually moving photos into folders, Smart Collections automatically gather photos that match specific rules you define. As you add new photos or change metadata, your Smart Collections update instantly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      {
                        title: "Rule-Based Filtering",
                        desc: "Create rules based on quality scores, AI tags, dates, culling status, and more. For example: 'Quality > 0.8 AND Tag = Portrait'.",
                        icon: Filter,
                        color: "text-indigo-400"
                      },
                      {
                        title: "Always Up to Date",
                        desc: "When you import new photos or change a photo's status (like marking it as 'Keep'), it automatically appears in matching Smart Collections.",
                        icon: FolderSync,
                        color: "text-green-400"
                      },
                      {
                        title: "Lightning Fast",
                        desc: "Powered by our advanced indexing engine, Smart Collections load instantly even with hundreds of thousands of photos.",
                        icon: Zap,
                        color: "text-amber-400"
                      }
                    ].map((step, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className={`shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${step.color}`}>
                          <step.icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-white">{step.title}</h4>
                          <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-3">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                    <p className="text-xs text-indigo-200/80 leading-relaxed">
                      <strong>Pro Tip:</strong> Click "Create New" to build your own custom rules. You can combine multiple conditions using AND / OR logic to find exactly what you need.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowWizard(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Got it, let's go
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="collections"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 space-y-8"
                >
                  {/* Smart Collections */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Smart Collections</h3>
                      <button
                        onClick={() => setIsBuildingRule(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => { setActiveCollection(null); onClose(); }}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                          activeCollectionId === null 
                            ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <LayoutGrid className="w-5 h-5" />
                          <span className="font-medium">All Photos</span>
                        </div>
                      </button>
                      
                      {smartCollections.map(collection => (
                        <div
                          key={collection.id}
                          className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                            activeCollectionId === collection?.id 
                              ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <button
                            onClick={() => { setActiveCollection(collection?.id); onClose(); }}
                            className="flex-1 flex items-center gap-3 truncate"
                          >
                            {getIcon(collection?.name || '')}
                            <span className="font-medium truncate">{collection?.name}</span>
                          </button>
                          
                          <div className="flex items-center gap-2 pl-2">
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full font-medium">
                              {collection?.results?.length}
                            </span>
                            {!collection.readonly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete collection "${collection?.name}"?`)) {
                                    deleteCollection(collection?.id);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                                title="Delete collection"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* User Collections */}
                  {userCollections.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Custom Collections</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {userCollections.map(collection => (
                          <div
                            key={collection.id}
                            className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                              activeCollectionId === collection?.id 
                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <button
                              onClick={() => { setActiveCollection(collection?.id); onClose(); }}
                              className="flex-1 flex items-center gap-3 truncate"
                            >
                              <LayoutGrid className="w-5 h-5 text-zinc-500" />
                              <span className="font-medium truncate">{collection?.name}</span>
                            </button>
                            
                            <div className="flex items-center gap-2 pl-2">
                              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full font-medium">
                                {collection?.results?.length}
                              </span>
                              {!collection.readonly && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete collection "${collection?.name}"?`)) {
                                      deleteCollection(collection?.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                                  title="Delete collection"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
