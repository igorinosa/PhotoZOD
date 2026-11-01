import React, { useState } from 'react';
import { ImportedAsset } from '../../../../core/pipeline/import/importManagerTypes';
import { assetStore } from '../../../../core/dam/assetStore';
import { batchRunner } from '../../../../core/photocode/batchRunner';
import { renderPipeline } from '../../../../core/pipeline/render/renderPipeline';
import { blobToFloat32Array, float32ArrayToBlob } from '../../../../core/pipeline/render/imageUtils';
import { importState } from '../../../../core/pipeline/import/importState';
import { ShieldAlert, ArrowRight, EyeOff, FileWarning, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScrubberModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: ImportedAsset[];
}

export function ScrubberModal({ isOpen, onClose, assets }: ScrubberModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'safe' | 'full' | 'custom'>('safe');
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [showWizard, setShowWizard] = useState(true);

  if (!isOpen) return null;

  const handleScrub = async () => {
    if (assets.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      let photocode = `Metadata:\n  Scrub:\n    mode: ${mode}`;
      if (mode === 'custom' && customFields.length > 0) {
        photocode += `\n    remove: [${customFields.join(', ')}]`;
      }
      const ops = await renderPipeline.compilePhotoCode(photocode);

      if (ops.length === 0) {
        throw new Error("Failed to compile scrub operation");
      }

      const updatedAssets = [...importState.assets];

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setProgress(Math.round((i / assets.length) * 100));

        const assetRes = await fetch(asset.previewUrl);
        const assetBlob = await assetRes.blob();
        const { buffer, width, height } = await blobToFloat32Array(assetBlob);

        const [result] = await batchRunner.runBatch(ops, [{
          id: asset.assetId,
          buffer,
          metadata: asset.metadata
        }]);

        if (result.success && result.buffer) {
          const resultBlob = await float32ArrayToBlob(result.buffer, width, height);
          const newUrl = URL.createObjectURL(resultBlob);
          
          const index = updatedAssets.findIndex(a => a.assetId === asset.assetId);
          if (index !== -1) {
            updatedAssets[index] = {
              ...updatedAssets[index],
              previewUrl: newUrl,
              thumbnailUrl: newUrl,
              metadata: asset.metadata // Use the mutated metadata
            };
            assetStore.update(asset.assetId, updatedAssets[index]);
            importState.notifyAssetUpdate(updatedAssets[index]);
          }
        }
      }

      onClose();
    } catch (err) {
      console.error("Scrub failed:", err);
      alert("Failed to scrub metadata. Check console for details.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const toggleCustomField = (field: string) => {
    setCustomFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-2xl flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Metadata Scrubber</h3>
                <p className="text-xs text-zinc-400">Clean {assets.length} photos of sensitive data</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {showWizard ? (
              <motion.div
                key="wizard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 p-2"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Protect Your Privacy</h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Photos contain hidden metadata like GPS location, camera serial numbers, and device info. Scrubbing removes this sensitive data before you share or export.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      title: "Location Privacy",
                      desc: "Remove GPS coordinates to prevent exposing your home or client locations.",
                      icon: EyeOff,
                      color: "text-red-400"
                    },
                    {
                      title: "Device Anonymity",
                      desc: "Strip camera serial numbers and owner names to prevent tracking.",
                      icon: FileWarning,
                      color: "text-amber-400"
                    },
                    {
                      title: "Non-Destructive Image",
                      desc: "Only metadata is removed. Your image quality and pixels are never touched.",
                      icon: CheckCircle,
                      color: "text-emerald-400"
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

                <button
                  onClick={() => setShowWizard(false)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Got it, let's scrub my photos
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="tool"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input 
                      type="radio" 
                      name="scrubMode" 
                      value="safe" 
                      checked={mode === 'safe'} 
                      onChange={() => setMode('safe')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-zinc-200">Safe Mode</div>
                      <div className="text-xs text-zinc-500">Removes GPS, serial numbers, and device info. Preserves copyright and dates.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input 
                      type="radio" 
                      name="scrubMode" 
                      value="full" 
                      checked={mode === 'full'} 
                      onChange={() => setMode('full')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-zinc-200">Full Scrub</div>
                      <div className="text-xs text-zinc-500">Removes ALL metadata except basic image dimensions.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input 
                      type="radio" 
                      name="scrubMode" 
                      value="custom" 
                      checked={mode === 'custom'} 
                      onChange={() => setMode('custom')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-zinc-200">Custom</div>
                      <div className="text-xs text-zinc-500">Select specific metadata groups to remove.</div>
                    </div>
                  </label>
                </div>

                {mode === 'custom' && (
                  <div className="flex flex-col gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-xs font-medium text-zinc-400 mb-1">Select fields to remove:</div>
                    {['gps', 'serial', 'device', 'software', 'location'].map(field => (
                      <label key={field} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={customFields.includes(field)}
                          onChange={() => toggleCustomField(field)}
                          className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                        />
                        <span className="capitalize">{field}</span>
                      </label>
                    ))}
                  </div>
                )}

                {isProcessing && (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Scrubbing metadata...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div 
                        className="bg-red-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    onClick={onClose}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScrub}
                    disabled={isProcessing || assets.length === 0 || (mode === 'custom' && customFields.length === 0)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing ? 'Scrubbing...' : 'Scrub Metadata'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
