import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowRight, History, Check, X, Info, User, Mail, Globe, Copyright, HelpCircle, Play } from 'lucide-react';
import { ImportedAsset } from '../../../../core/pipeline/import/importManagerTypes';
import { assetStore } from '../../../../core/dam/assetStore';
import { renderPipeline } from '../../../../core/pipeline/render/renderPipeline';
import { executor } from '../../../../core/photocode/executor';
import { previewCache } from '../../../../core/cache/previewCache';
import { useSettingsStore } from '../../state/settingsStore';

interface CopyrightModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: ImportedAsset[];
}

export function CopyrightModal({ isOpen, onClose, assets }: CopyrightModalProps) {
  const { autoApplyCopyright, setAutoApplyCopyright, setDefaultCopyright, defaultCopyright } = useSettingsStore();

  const [author, setAuthor] = useState(defaultCopyright?.author || '');
  const [notice, setNotice] = useState(defaultCopyright?.notice || '');
  const [email, setEmail] = useState(defaultCopyright?.email || '');
  const [website, setWebsite] = useState(defaultCopyright?.website || '');
  const [showWizard, setShowWizard] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update fields when modal opens to reflect latest default settings
  useEffect(() => {
    if (isOpen && defaultCopyright) {
      setAuthor(prev => prev || defaultCopyright.author);
      setNotice(prev => prev || defaultCopyright.notice);
      setEmail(prev => prev || defaultCopyright.email);
      setWebsite(prev => prev || defaultCopyright.website);
    }
  }, [isOpen, defaultCopyright]);

  // Auto-generate notice when author changes
  useEffect(() => {
    if (author && !notice) {
      setNotice(`© ${new Date().getFullYear()} ${author}`);
    }
  }, [author]);

  const handleApply = async () => {
    if (!author) {
      setError("Author name is required.");
      return;
    }

    setIsApplying(true);
    try {
      const payload = { author, notice, email, website };
      
      // Update default settings if auto-apply is on
      if (autoApplyCopyright) {
        setDefaultCopyright(payload);
      }

      const safeAuthor = author.replace(/"/g, "'");
      const safeNotice = notice.replace(/"/g, "'");
      const safeEmail = email.replace(/"/g, "'");
      const safeWebsite = website.replace(/"/g, "'");

      const code = `Metadata:
  Copyright:
    author: "${safeAuthor}"
    notice: "${safeNotice}"
    email: "${safeEmail}"
    website: "${safeWebsite}"
`;

      const ops = await renderPipeline.compilePhotoCode(code);
      
      const updates = await Promise.all(
        assets.map(async (asset) => {
          const updatedMetadata = await executor.executeMetadata(ops, asset.metadata, asset.assetId);
          await previewCache.updateMetadata(asset.assetId, updatedMetadata);
          
          return {
            assetId: asset.assetId,
            updates: { 
              exif: {
                ...asset.exif,
                Artist: updatedMetadata.exif?.Artist,
                Copyright: updatedMetadata.exif?.Copyright,
                Byline: updatedMetadata.iptc?.Byline,
                CopyrightNotice: updatedMetadata.iptc?.CopyrightNotice,
                "dc:creator": updatedMetadata.xmp?.["dc:creator"],
                "dc:rights": updatedMetadata.xmp?.["dc:rights"],
                "dc:creatorContactInfo": updatedMetadata.xmp?.["dc:creatorContactInfo"]
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
      setError("Failed to apply copyright. Please check your input.");
    } finally {
      setIsApplying(false);
    }
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
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Copyright Injection</h2>
                <p className="text-xs text-zinc-400">Protect {assets.length} photos with ownership data</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
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
                    <h3 className="text-xl font-semibold text-white">Protect Your Work</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Embed your name and contact info directly into your photos. This data stays with the image even when shared or exported.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      {
                        title: "Professional Standards",
                        desc: "We write to EXIF, IPTC, and XMP simultaneously for maximum compatibility.",
                        icon: Copyright,
                        color: "text-indigo-400"
                      },
                      {
                        title: "Export Safe",
                        desc: "Ownership data survives social media uploads and professional exports.",
                        icon: Globe,
                        color: "text-emerald-400"
                      },
                      {
                        title: "Non-Destructive",
                        desc: "We only add ownership info. Your original camera settings are never touched.",
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

                  <button
                    onClick={() => setShowWizard(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Got it, let's protect my photos
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Author Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Copyright Notice</label>
                      <div className="relative">
                        <Copyright className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          value={notice}
                          onChange={(e) => setNotice(e.target.value)}
                          placeholder="e.g. © 2026 John Doe"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. john@example.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Website URL</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="e.g. www.johndoe.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                      <Info className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 space-y-3">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Preview (First 5)</h4>
                    <div className="space-y-2">
                      {assets.slice(0, 5).map((asset, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                          <span className="text-zinc-400 truncate max-w-[150px]">{asset.file.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600 italic">No Author</span>
                            <ArrowRight className="w-3 h-3 text-zinc-600" />
                            <span className="text-emerald-400 font-medium">{author || '...'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">Auto-apply on import</h4>
                        <p className="text-xs text-zinc-400">Automatically embed these details into new photos</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAutoApplyCopyright(!autoApplyCopyright)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${autoApplyCopyright ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoApplyCopyright ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!showWizard && (
            <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/50 flex items-center justify-between">
              <button
                onClick={() => setShowWizard(true)}
                className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                How it works
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying || !author}
                  className={`
                    px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all
                    ${isApplied 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed'}
                  `}
                >
                  {isApplying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Applying...
                    </>
                  ) : isApplied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Injected!
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Apply Copyright
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
