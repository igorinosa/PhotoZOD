import React, { useState, useEffect } from 'react';
import { ImportedAsset } from '../../../../core/pipeline/import/importManagerTypes';
import { assetStore, normalizeTag } from '../../../../core/dam/assetStore';
import { autoSaveManager } from '../../../../core/storage/autoSave';
import { X, Star, Tag, Palette, HelpCircle, ChevronRight, ChevronLeft, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImage } from '../components/SmartImage';

interface MetadataTaggingViewProps {
  assets: ImportedAsset[];
  onClose: () => void;
}

const COLORS = [
  { name: 'red', hex: '#ef4444', label: 'Urgent' },
  { name: 'green', hex: '#22c55e', label: 'Approved' },
  { name: 'blue', hex: '#3b82f6', label: 'Client Selects' },
  { name: 'none', hex: 'transparent', label: 'None' }
];

export function MetadataTaggingView({ assets, onClose }: MetadataTaggingViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentAsset = assets[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if typing in input
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(assets.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assets.length, onClose]);

  const handleClose = () => {
    autoSaveManager.commit();
    onClose();
  };

  if (!currentAsset) return null;

  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      const newTag = normalizeTag(keywordInput);
      const currentTags = currentAsset.ai?.tags || [];
      
      if (!currentTags.includes(newTag)) {
        assetStore.batchUpdate([{
          assetId: currentAsset.assetId,
          updates: {
            ai: {
              ...currentAsset.ai,
              tags: [...currentTags, newTag]
            }
          }
        }]);
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (tagToRemove: string) => {
    const currentTags = currentAsset.ai?.tags || [];
    assetStore.batchUpdate([{
      assetId: currentAsset.assetId,
      updates: {
        ai: {
          ...currentAsset.ai,
          tags: currentTags.filter(t => t !== tagToRemove)
        }
      }
    }]);
  };

  const handleSetColor = (colorName: string) => {
    assetStore.batchUpdate([{
      assetId: currentAsset.assetId,
      updates: {
        colorTag: colorName === 'none' ? null : colorName
      }
    }]);
  };

  const handleSetRating = (rating: number) => {
    // Toggle off if clicking the same rating
    const newRating = currentAsset.rating === rating ? null : rating;
    assetStore.batchUpdate([{
      assetId: currentAsset.assetId,
      updates: {
        rating: newRating as any
      }
    }]);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-medium text-zinc-100">Metadata Tagging</h2>
          <span className="text-sm text-zinc-500 ml-2">
            {currentIndex + 1} of {assets.length}
          </span>
          <button 
            onClick={() => { setShowWizard(true); setWizardStep(0); }}
            className="ml-4 flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-indigo-500/20 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            How to use
          </button>
        </div>
        <button 
          onClick={handleClose}
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-zinc-950">
        {/* Photo View */}
        <div className="flex-1 p-4 sm:p-8 flex items-center justify-center relative min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAsset.assetId}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center"
            >
              <SmartImage 
                src={currentAsset.previewUrl} 
                assetId={currentAsset.assetId}
                alt={currentAsset.fileName}
                className="w-full h-full object-contain rounded-xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.7)] border border-zinc-800/50"
                retryCount={5}
              />
            </motion.div>
          </AnimatePresence>
          
          {/* Tagging Bar Overlay */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col sm:flex-row items-center gap-6 w-[95vw] sm:w-auto sm:min-w-[600px] max-w-full z-40 transition-all duration-300">
            
            {/* Mobile Toggle Button */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="sm:hidden absolute -top-4 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full p-1 shadow-lg z-50"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>

            {/* Navigation: Previous */}
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-inner"
              title="Previous Photo"
            >
              <ChevronLeft size={28} />
            </button>

            <div className={`flex-col sm:flex-row items-stretch sm:items-center gap-6 flex-1 w-full ${isExpanded ? 'flex' : 'hidden sm:flex'}`}>
              {/* Part 1: Keywords */}
              <div className="flex-1 flex flex-col justify-center sm:border-r border-zinc-800 sm:pr-6 sm:min-w-[240px]">
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-[80px] overflow-y-auto no-scrollbar">
                  {(currentAsset.ai?.tags || []).length === 0 && (
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest py-1">No keywords</span>
                  )}
                  {(currentAsset.ai?.tags || []).map(tag => (
                    <span 
                      key={tag} 
                      className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] sm:text-xs font-bold text-indigo-300 flex items-center gap-1.5 group transition-all hover:bg-indigo-500/20"
                    >
                      {tag}
                      <button 
                        onClick={() => handleRemoveKeyword(tag)}
                        className="opacity-40 group-hover:opacity-100 hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                    <Tag size={14} />
                  </div>
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    placeholder="Add keyword..."
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 placeholder-zinc-700 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-0 w-full overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                {/* Part 2: Colors */}
                <div className="flex items-center justify-center sm:border-r border-zinc-800 sm:px-6 gap-3 shrink-0">
                  {COLORS.map(color => (
                    <button
                      key={color.name}
                      onClick={() => handleSetColor(color.name)}
                      className={`group relative flex flex-col items-center gap-1.5 transition-all ${
                        currentAsset.colorTag === color.name ? 'scale-110' : 'hover:scale-105 active:scale-95'
                      }`}
                    >
                      <div 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all ${
                          currentAsset.colorTag === color.name 
                            ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                            : 'border-transparent'
                        } ${color.name === 'none' ? 'bg-zinc-800 border-zinc-700 border-dashed' : ''}`}
                        style={{ backgroundColor: color.name !== 'none' ? color.hex : undefined }}
                      />
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-colors ${
                        currentAsset.colorTag === color.name ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
                      }`}>
                        {color.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Part 3: Star Rating */}
                <div className="flex items-center justify-center sm:pl-6 gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleSetRating(star)}
                      className="p-1 hover:scale-125 active:scale-90 transition-all group"
                    >
                      <Star 
                        className={`w-6 h-6 sm:w-7 sm:h-7 transition-all ${
                          (currentAsset.rating || 0) >= star 
                            ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' 
                            : 'text-zinc-700 group-hover:text-zinc-500'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className={`flex sm:hidden items-center justify-between w-full ${isExpanded ? 'pt-2 border-t border-zinc-800 mt-2' : ''}`}>
              <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-30 text-sm font-bold"
              >
                <ChevronLeft size={18} />
                Prev
              </button>
              <span className="text-xs text-zinc-500 font-medium">
                {currentIndex + 1} / {assets.length}
              </span>
              <button 
                onClick={() => {
                  if (currentIndex === assets.length - 1) {
                    handleClose();
                  } else {
                    setCurrentIndex(prev => prev + 1);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold transition-all ${
                  currentIndex === assets.length - 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {currentIndex === assets.length - 1 ? 'Done' : 'Next'}
                {currentIndex === assets.length - 1 ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>

            {/* Navigation: Next */}
            <button 
              onClick={() => {
                if (currentIndex === assets.length - 1) {
                  handleClose();
                } else {
                  setCurrentIndex(prev => prev + 1);
                }
              }}
              className={`hidden sm:flex items-center justify-center gap-3 px-6 py-3 rounded-2xl text-white transition-all shrink-0 shadow-xl active:scale-95 ${
                currentIndex === assets.length - 1 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
              }`}
              title={currentIndex === assets.length - 1 ? "Finish Tagging" : "Next Photo"}
            >
              <span className="text-sm font-black uppercase tracking-widest">
                {currentIndex === assets.length - 1 ? 'Finish' : 'Next'}
              </span>
              {currentIndex === assets.length - 1 ? <CheckCircle2 size={24} /> : <ChevronRight size={24} />}
            </button>
          </div>
        </div>

        {/* Filmstrip */}
        <div className="h-28 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex items-center px-4 gap-3 overflow-x-auto no-scrollbar">
          {assets.map((asset, idx) => (
            <button
              key={asset.assetId}
              onClick={() => setCurrentIndex(idx)}
              className={`relative h-20 min-w-[100px] rounded-xl overflow-hidden border-2 transition-all shrink-0 group ${
                idx === currentIndex ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/20' : 'border-transparent opacity-40 hover:opacity-100'
              }`}
            >
              <SmartImage 
                src={asset?.thumbnailUrl} 
                assetId={asset?.assetId}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                retryCount={5}
              />
              
              {/* Badges in filmstrip */}
              <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                {asset.colorTag && asset.colorTag !== 'none' && (
                  <div 
                    className="w-2.5 h-2.5 rounded-full shadow-sm border border-white/20"
                    style={{ backgroundColor: COLORS.find(c => c.name === asset.colorTag)?.hex }}
                  />
                )}
                {asset.rating && (
                  <div className="bg-black/60 backdrop-blur-sm rounded-full p-0.5 flex items-center justify-center">
                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Instruction Wizard */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">How to Tag Your Photos</h3>
                </div>
                <button onClick={() => setShowWizard(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <div className="flex justify-center mb-8">
                  <div className="flex gap-2">
                    {[0, 1, 2].map(step => (
                      <div 
                        key={step} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          step === wizardStep ? 'w-8 bg-indigo-500' : 'w-2 bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {wizardStep === 0 && (
                    <motion.div 
                      key="step0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4 text-center"
                    >
                      <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 mb-6">
                        <Tag size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-white">Keyword Tagging</h4>
                      <p className="text-zinc-400 leading-relaxed">
                        Type a keyword in the input box and press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300">Enter</kbd> to add it before typing another. These tags are searchable using the semantic search bar.
                      </p>
                    </motion.div>
                  )}

                  {wizardStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4 text-center"
                    >
                      <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 mb-6">
                        <Palette size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-white">Color Labels</h4>
                      <p className="text-zinc-400 leading-relaxed mb-6">
                        Use specific color labels to organize your workflow:
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#ef4444]" />
                          <span className="text-[10px] font-bold text-zinc-300 uppercase">Urgent</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#22c55e]" />
                          <span className="text-[10px] font-bold text-zinc-300 uppercase">Approved</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#3b82f6]" />
                          <span className="text-[10px] font-bold text-zinc-300 uppercase">Client Selects</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4 text-center"
                    >
                      <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 mb-6">
                        <Star size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-white">Star Ratings</h4>
                      <p className="text-zinc-400 leading-relaxed">
                        Assign a 1-5 star rating to your photos by clicking the stars. Click the same star again to clear the rating.
                      </p>
                      <div className="pt-4 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                          <div className="flex items-center gap-1 text-indigo-400">
                            <ChevronLeft size={20} />
                            <ChevronRight size={20} />
                          </div>
                          <span className="text-xs text-zinc-300 font-medium">Use the Prev/Next buttons or Arrow Keys to navigate</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center">
                <button 
                  onClick={() => setWizardStep(prev => Math.max(0, prev - 1))}
                  disabled={wizardStep === 0}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white disabled:opacity-0 transition-all"
                >
                  Back
                </button>
                {wizardStep < 2 ? (
                  <button 
                    onClick={() => setWizardStep(prev => prev + 1)}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowWizard(false)}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all"
                  >
                    <CheckCircle2 size={16} />
                    Got it!
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
