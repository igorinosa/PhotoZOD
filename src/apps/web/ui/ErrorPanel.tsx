import React, { useState, useEffect } from 'react';
import { errorReporter, AppError } from './errorReporter';

export default function ErrorPanel() {
  const [errors, setErrors] = useState<AppError[]>([]);

  useEffect(() => {
    const unsubscribe = errorReporter.subscribe((error) => {
      setErrors(prev => [error, ...prev].slice(0, 5)); // Keep last 5
    });
    return unsubscribe;
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {errors.map(error => (
        <div 
          key={error.id} 
          className="bg-red-950/90 border border-red-500/50 text-red-200 p-3 rounded-lg shadow-lg backdrop-blur-sm flex justify-between items-start gap-3 animate-in slide-in-from-bottom-5"
        >
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
              {error.type} Error
            </span>
            <span className="text-sm">{error.message}</span>
          </div>
          <button 
            onClick={() => setErrors(prev => prev.filter(e => e.id !== error.id))}
            className="text-red-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
