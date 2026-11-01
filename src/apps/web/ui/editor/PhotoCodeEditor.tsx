import React, { useState, useEffect } from 'react';
import { workerBridge } from '../../../../core/runtime/workerBridge';
import { ImageMetadata } from '../../../../core/engines/metadata/exif';
import { useEditorStore } from '../../state/editorStore';
import { errorReporter } from '../errorReporter';

interface PhotoCodeEditorProps {
  imageId: string;
  metadata: ImageMetadata;
  sourceBlob: Blob;
  onRender: (result: Blob, code: string) => void;
}

export default function PhotoCodeEditor({ 
  imageId, 
  metadata, 
  sourceBlob, 
  onRender 
}: PhotoCodeEditorProps) {
  const { photocode: code, setPhotoCode, undo, redo, historyIndex, history } = useEditorStore();
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Debounce render
  useEffect(() => {
    if (!code.trim()) {
      onRender(sourceBlob, code);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setError(null);
        setIsRendering(true);
        
        // Execute in worker
        const result = await workerBridge.render(code, sourceBlob, metadata, imageId);
        onRender(result, code);
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        errorReporter.report(msg, 'execution');
      } finally {
        setIsRendering(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [code, sourceBlob, metadata, imageId, onRender]);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-zinc-200">PhotoCode</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={undo} 
            disabled={historyIndex === 0}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
            title="Undo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            onClick={redo} 
            disabled={historyIndex === history.length - 1}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
            title="Redo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          {isRendering && <span className="text-xs text-indigo-400 ml-2">Rendering...</span>}
        </div>
      </div>
      
      <div className="flex-1 p-4 relative flex flex-col gap-4 min-h-[400px] md:min-h-0">
        <textarea
          value={code}
          onChange={(e) => setPhotoCode(e.target.value)}
          className="flex-1 w-full bg-zinc-950 text-zinc-300 font-mono text-sm p-4 rounded-lg border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none min-h-[250px] md:min-h-0"
          placeholder="Exposure: 0.5&#10;Subject:&#10;  Skin Smooth: 30"
          spellCheck={false}
        />
        
        <button
          onClick={async () => {
            try {
              setError(null);
              setIsRendering(true);
              const result = await workerBridge.render(code, sourceBlob, metadata, imageId);
              onRender(result, code);
            } catch (err) {
              const msg = (err as Error).message;
              setError(msg);
            } finally {
              setIsRendering(false);
            }
          }}
          disabled={isRendering || !code.trim()}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isRendering ? 'Applying...' : 'Apply Changes'}
        </button>
        
        {error && (
          <div className="absolute bottom-16 left-4 right-4 bg-red-900/50 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg backdrop-blur-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
