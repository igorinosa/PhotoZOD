import React, { useState } from 'react';
import { zodDirector } from '../../../../core/ai/zodDirector';
import { useEditorStore } from '../../state/editorStore';
import { ImageMetadata } from '../../../../core/engines/metadata/exif';
import { SemanticData } from '../../../../core/ai/vision/semanticBuilder';

interface ZodDirectorProps {
  sourceBlob: Blob;
  metadata: ImageMetadata;
  semanticData?: SemanticData | null;
}

export default function ZodDirector({ sourceBlob, metadata, semanticData }: ZodDirectorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { photocode, setPhotoCode } = useEditorStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Enhance prompt with semantic context if available
      let enhancedPrompt = prompt;
      if (semanticData) {
        enhancedPrompt = `[Context: ${semanticData.caption}. Scene: ${semanticData.scene}. Lighting: ${semanticData.attributes.lighting}. Mood: ${semanticData.attributes.mood}.] ${prompt}`;
      }

      const newCode = await zodDirector.analyzeAndGenerate(
        enhancedPrompt,
        sourceBlob,
        metadata,
        photocode
      );
      
      setPhotoCode(newCode);
      setPrompt('');
    } catch (err) {
      console.error('ZOD Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PhotoCode');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          ZOD The AI Editor
        </h3>
        <p className="text-xs text-zinc-400 mt-1">Describe how you want to edit this photo.</p>
      </div>
      
      <div className="flex-1 p-4 flex flex-col gap-4 min-h-[400px] md:min-h-0">
        <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-800 p-3 overflow-y-auto min-h-[150px] md:min-h-0">
          {/* We could add chat history here in the future */}
          <div className="text-xs text-zinc-500 italic text-center mt-4">
            ZOD is ready to assist you.
          </div>
        </div>
        
        {error && (
          <div className="text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-900/50">
            {error}
          </div>
        )}
        
        <div className="relative shrink-0">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            disabled={isGenerating}
            placeholder="E.g., Make it moodier, increase contrast, and smooth the subject's skin..."
            className="w-full bg-zinc-950 text-zinc-300 text-sm p-3 pr-10 rounded-lg border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none min-h-[100px]"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="absolute bottom-3 right-3 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            {isGenerating ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
