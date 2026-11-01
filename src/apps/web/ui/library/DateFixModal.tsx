import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImage } from '../components/SmartImage';
import { Calendar, Clock, ArrowRight, History, AlertCircle, Check, X, Info, Undo2, Play, HelpCircle, ChevronRight } from 'lucide-react';
import { ImportedAsset } from '../../../../core/pipeline/import/importManagerTypes';
import { assetStore } from '../../../../core/dam/assetStore';
import { renderPipeline } from '../../../../core/pipeline/render/renderPipeline';
import { executor } from '../../../../core/photocode/executor';
import { parseTimeShift } from '../../../../core/metadata/timeParser';
import { previewCache } from '../../../../core/cache/previewCache';

interface DateFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: ImportedAsset[];
}

export function DateFixModal({ isOpen, onClose, assets }: DateFixModalProps) {
  const [mode, setMode] = useState<'shift' | 'absolute'>('shift');
  const [shiftValue, setShiftValue] = useState('+1h');
  const [absoluteDate, setAbsoluteDate] = useState(new Date().toISOString().slice(0, 16));
  const [preview, setPreview] = useState<{ assetId: string; oldTime: number; newTime: number }[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [showWizard, setShowWizard] = useState(true); // Show wizard by default for first-time clarity
  const [error, setError] = useState<string | null>(null);

  // 🧩 PART 7G.1.4 — PREVIEW SYSTEM
  useEffect(() => {
    let isMounted = true;
    const generatePreview = async () => {
      if (!isOpen || assets.length === 0) {
        setPreview([]);
        return;
      }

      setError(null);
      
      const safeShiftValue = shiftValue.replace(/"/g, "'");
      const safeAbsoluteDate = absoluteDate.replace(/"/g, "'");

      // CRITICAL: Add trailing newline for the parser
      const code = mode === 'shift' 
        ? `Metadata:\n  Date:\n    shift: "${safeShiftValue}"\n`
        : `Metadata:\n  Date:\n    set: "${safeAbsoluteDate}"\n`;

      try {
        const ops = await renderPipeline.compilePhotoCode(code);
        if (!isMounted) return;

        if (ops.length === 0) {
          setPreview([]);
          return;
        }

        const previewData = await Promise.all(
          assets.slice(0, 100).map(async (asset) => {
            const updated = await executor.executeMetadata(ops, asset.metadata, asset.assetId);
            return {
              assetId: asset.assetId,
              oldTime: asset.metadata.captureTime,
              newTime: updated.captureTime
            };
          })
        );

        if (isMounted) {
          setPreview(previewData);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Preview failed", err);
          setError("Invalid input format");
          setPreview([]);
        }
      }
    };

    generatePreview();
    return () => { isMounted = false; };
  }, [isOpen, assets, mode, shiftValue, absoluteDate]);

  const handleApply = async () => {
    if (isApplying || (mode === 'shift' && !shiftValue) || showWizard || isApplied) return;
    setIsApplying(true);
    try {
      const safeShiftValue = shiftValue.replace(/"/g, "'");
      const safeAbsoluteDate = absoluteDate.replace(/"/g, "'");

      // CRITICAL: Add trailing newline for the parser
      const code = mode === 'shift' 
        ? `Metadata:\n  Date:\n    shift: "${safeShiftValue}"\n`
        : `Metadata:\n  Date:\n    set: "${safeAbsoluteDate}"\n`;

      const ops = await renderPipeline.compilePhotoCode(code);
      
      // 🧩 PART 7G.1.5 — APPLY & HISTORY
      const updates = await Promise.all(
        assets.map(async (asset) => {
          const updatedMetadata = await executor.executeMetadata(ops, asset.metadata, asset.assetId);
          
          // Update persistent cache
          await previewCache.updateMetadata(asset.assetId, updatedMetadata);
          
          return {
            assetId: asset.assetId,
            updates: { 
              exif: { 
                ...asset.exif, 
                captureTime: updatedMetadata.captureTime 
              } 
            }
          };
        })
      );

      assetStore.batchUpdate(updates);
      setIsApplied(true);
      setTimeout(() => {
        setIsApplied(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Apply failed", err);
      setError("Failed to apply changes. Please check your input.");
    } finally {
      setIsApplying(false);
    }
  };

  const formatTime = (ms: number) => {
    if (!ms) return 'No Date';
    return new Date(ms).toLocaleString([], { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Date Fix System</h2>
                <p className="text-xs text-zinc-400">Correct timestamps for {assets.length} photos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowWizard(!showWizard)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${showWizard ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}
                title="How it works"
              >
                <Info className="w-3 h-3" />
                How it works
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {showWizard ? (
                <motion.div 
                  key="wizard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8 p-4"
                >
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Fix Photo Dates</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Did your camera have the wrong time? Use this tool to fix the dates for all your photos at once.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      {
                        title: "Adjust Time",
                        desc: "Move photos forward or backward (e.g. +1 hour). Perfect for fixing time zone mistakes.",
                        icon: Clock,
                        color: "text-indigo-400"
                      },
                      {
                        title: "Set One Date",
                        desc: "Give every photo the exact same date and time. Use this if the camera date was totally wrong.",
                        icon: Calendar,
                        color: "text-emerald-400"
                      },
                      {
                        title: "Always Safe",
                        desc: "We never change your original files. You can always change the time back or undo your changes.",
                        icon: History,
                        color: "text-purple-400"
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
                    <div className="space-y-1">
                      <p className="text-xs text-indigo-200/80 leading-relaxed">
                        <strong>Pro Tip:</strong> Check the preview list to see how the dates will change before you save.
                      </p>
                      <p className="text-[10px] text-indigo-300/60">
                        Note: We always use the photo's original time as a starting point, so you can't break anything.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowWizard(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Got it, let's fix dates
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Mode Selection */}
                  <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => setMode('shift')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'shift' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Time Shift
                    </button>
                    <button
                      onClick={() => setMode('absolute')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'absolute' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Absolute Set
                    </button>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-4">
                    {mode === 'shift' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Time Offset</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="text"
                            value={shiftValue}
                            onChange={(e) => setShiftValue(e.target.value)}
                            placeholder="+1h, -30m, +2d..."
                            className={`w-full bg-zinc-950 border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${error ? 'border-red-500/50' : 'border-zinc-800'}`}
                          />
                        </div>
                        {error ? (
                          <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {error}
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-500">Use +/- followed by h (hours), m (minutes), s (seconds), or d (days).</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Target Date & Time</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="datetime-local"
                            value={absoluteDate}
                            onChange={(e) => setAbsoluteDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Preview (First 100)</label>
                      {Math.abs(parseTimeShift(shiftValue)) > 24 * 60 * 60 * 1000 && mode === 'shift' && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                          <AlertCircle className="w-3 h-3" /> Large shift warning
                        </div>
                      )}
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-900 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {assets.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm italic">
                          No photos selected. Close this modal and select photos first.
                        </div>
                      ) : preview.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm italic">
                          {error ? "Invalid input format. Please check your offset." : "Generating preview..."}
                        </div>
                      ) : (
                        preview.map((item, i) => {
                          const asset = assets.find(a => a.assetId === item.assetId);
                          return (
                            <div key={item.assetId} className="p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-zinc-800 overflow-hidden shrink-0">
                                  <SmartImage 
                                    src={asset?.thumbnailUrl} 
                                    assetId={asset?.assetId}
                                    className="w-full h-full object-cover" 
                                    alt="" 
                                    retryCount={5}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] text-zinc-500 truncate">{asset?.fileName}</p>
                                  <p className="text-xs text-zinc-300">{formatTime(item.oldTime)}</p>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-zinc-700 mx-2 shrink-0" />
                              <div className="text-right">
                                <p className="text-xs font-medium text-indigo-400">{formatTime(item.newTime)}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {assets.length > 100 && (
                        <div className="p-3 text-center text-[10px] text-zinc-600 italic">
                          + {assets.length - 100} more assets...
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <History className="w-4 h-4" />
              <span>Fully reversible</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={isApplying || (mode === 'shift' && !shiftValue) || showWizard || isApplied}
                className={`px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${
                  isApplied 
                    ? 'bg-green-500 text-white shadow-green-500/20' 
                    : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-indigo-500/20'
                }`}
              >
                {isApplying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Applying...
                  </>
                ) : isApplied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Applied!
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Apply Fix
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
