import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Trash2, Shield, X, ChevronDown, ChevronUp } from 'lucide-react';

interface DeleteSafetyModalProps {
  isOpen: boolean;
  unbackedCount: number;
  totalCount: number;
  onCancel: () => void;
  onDeleteAnyway: () => void;
  onBackupFirst: () => void;
}

export default function DeleteSafetyModal({
  isOpen,
  unbackedCount,
  totalCount,
  onCancel,
  onDeleteAnyway,
  onBackupFirst
}: DeleteSafetyModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowAdvanced(false);
      setConfirmText('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-6">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Risky Deletion</h3>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                {unbackedCount === totalCount 
                  ? `All ${totalCount} files are NOT backed up.`
                  : `${unbackedCount} of ${totalCount} files are NOT backed up.`}
                <br />
                Deleting them now might result in permanent data loss if you empty the trash.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={onBackupFirst}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
              >
                <Shield className="w-4 h-4" />
                Backup Now (Recommended)
              </button>
              
              <button 
                onClick={onCancel}
                className="w-full py-4 bg-zinc-800 text-zinc-300 rounded-2xl font-black text-sm hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>

              <div className="pt-4">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full py-2 text-zinc-500 text-xs font-bold flex items-center justify-center gap-1 hover:text-zinc-400 transition-all"
                >
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Advanced Options
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4 pt-4"
                    >
                      <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-center">
                          Type <span className="text-red-500">DELETE</span> to confirm bypass
                        </p>
                        <input 
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                          placeholder="DELETE"
                          className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-center text-red-500 font-black tracking-widest focus:outline-none focus:border-red-500/50 transition-all"
                        />
                      </div>
                      <button 
                        disabled={confirmText !== 'DELETE'}
                        onClick={onDeleteAnyway}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                          confirmText === 'DELETE' 
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                            : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Anyway
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
