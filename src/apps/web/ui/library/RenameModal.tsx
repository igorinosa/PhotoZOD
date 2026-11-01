import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Hash, Calendar, Clock, FileText, Type, AlertCircle, Check, Undo2, Play, HelpCircle, ChevronRight, Info } from 'lucide-react';
import { ImportedAsset } from '../../../../core/pipeline/import/importManagerTypes';
import { renameManager, RenameOperation } from '../../../../core/rename/apply';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: ImportedAsset[];
}

export function RenameModal({ isOpen, onClose, assets }: RenameModalProps) {
  const [baseName, setBaseName] = useState('Wedding');
  const [preview, setPreview] = useState<RenameOperation[]>([]);
  const [isApplied, setIsApplied] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // 🧩 PART 7F.7 — PREVIEW SYSTEM
  // Automatically appends _{index} to the base name
  useEffect(() => {
    if (baseName.trim()) {
      // We use a fixed pattern internally: {custom}_{index}{ext}
      // generator.ts will handle the extension if we pass a pattern that doesn't include it,
      // but it's safer to pass {ext} to ensure it's preserved.
      const pattern = `{custom}_{index}{ext}`;
      const newPreview = renameManager.generatePreview(assets, pattern, baseName);
      setPreview(newPreview);
    } else {
      setPreview([]);
    }
  }, [baseName, assets]);

  // 🧩 PART 7F.12 — VALIDATION RULES
  const isValid = useMemo(() => {
    if (!baseName.trim()) return false;
    // Basic check for invalid filename characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(baseName)) return false;
    return true;
  }, [baseName]);

  const handleApply = () => {
    if (!isValid) return;
    renameManager.applyRename(preview);
    setIsApplied(true);
    setTimeout(() => {
      setIsApplied(false);
      onClose();
    }, 1500);
  };

  const handleUndo = () => {
    renameManager.undo();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Type className="w-5 h-5 text-blue-400" />
                Batch Rename ({assets.length} images)
              </h2>
              <button 
                onClick={() => setShowWizard(!showWizard)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${showWizard ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}
              >
                <HelpCircle className="w-3 h-3" />
                How it works
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>

          {/* Main Content Area - Scrollable */}
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
                    <h3 className="text-xl font-semibold text-white">Simple Batch Rename</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Just give your photos a name, and we'll automatically add a 6-digit sequence (e.g., 000001) to keep them organized and unique.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      {
                        title: "Automatic Numbering",
                        desc: "We append a 6-digit counter to your name (e.g., Wedding_000001.jpg) to ensure every file is unique.",
                        icon: Hash,
                        color: "text-blue-400"
                      },
                      {
                        title: "Safe & Reversible",
                        desc: "Your original files aren't touched until you're ready. Made a mistake? Use 'Undo' to revert instantly.",
                        icon: Undo2,
                        color: "text-purple-400"
                      },
                      {
                        title: "Collision Protection",
                        desc: "We check for existing files to prevent accidental overwrites, keeping your library safe.",
                        icon: AlertCircle,
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

                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-200/80 leading-relaxed">
                      <strong>How it works:</strong> If you enter "Wedding", your files will become "Wedding_000001.jpg", "Wedding_000002.jpg", and so on.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowWizard(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Got it, let's rename
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="rename"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 space-y-6"
                >
                  {/* Simple Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">New Base Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={baseName}
                        onChange={(e) => setBaseName(e.target.value)}
                        placeholder="e.g. Mike and Flora Wedding"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                      {!isValid && baseName && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-400 text-xs">
                          <AlertCircle className="w-4 h-4" />
                          Invalid name
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-white/20 italic">
                      Sequence numbers (e.g. _000001) will be added automatically.
                    </p>
                  </div>

                  {/* Preview Panel */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Preview</label>
                    <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse table-fixed">
                          <thead className="sticky top-0 bg-[#252525] border-b border-white/5 z-10">
                            <tr>
                              <th className="px-4 py-2 text-white/40 font-medium w-1/2">Original Name</th>
                              <th className="px-4 py-2 text-white/40 font-medium w-1/2">New Name</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {preview.slice(0, 100).map((op) => (
                              <tr key={op.assetId} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-2 text-white/40 break-all">{op.oldName}</td>
                                <td className="px-4 py-2 text-blue-400 font-medium break-all">{op.newName}</td>
                              </tr>
                            ))}
                            {preview.length > 100 && (
                              <tr>
                                <td colSpan={2} className="px-4 py-2 text-center text-white/20 italic">
                                  ... and {preview.length - 100} more
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between shrink-0">
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/40 hover:text-white transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              Undo Last
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!isValid || isApplied || showWizard}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  isApplied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20'
                }`}
              >
                {isApplied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Applied!
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Apply Rename
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
