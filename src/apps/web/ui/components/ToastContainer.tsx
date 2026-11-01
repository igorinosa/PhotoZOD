import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from './toastStore';
import { X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-zinc-800 text-white px-4 py-3 rounded-lg shadow-xl border border-white/10 flex items-center gap-4 pointer-events-auto min-w-[300px]"
          >
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  removeToast(toast.id);
                }}
                className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/50 hover:text-white/80 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
