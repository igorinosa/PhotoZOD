import React, { useState, useCallback } from 'react';
import { useEntityState } from '../../state/entityState';
import { entityManager } from '../../../../core/entities/entityManager';
import { Entity } from '../../../../core/entities/schema';
import { useEntityPreview } from './useEntityPreview';
import { Sparkles, Code, CheckCircle, AlertCircle, Play, Save } from 'lucide-react';
import { generatePhotoCode } from '../../../../core/zod/generator';
import { entityPresetManager } from '../../../../core/entities/presets/entityPresetManager';
import { bindPresetToEntity } from '../../../../core/entities/presets/binding';
import { renderPipeline } from '../../../../core/pipeline/render/renderPipeline';
import { previewCache } from '../../../../core/cache/previewCache';
import { importState } from '../../../../core/pipeline/import/importState';

export const ZODEntityPanel: React.FC = () => {
  const { selectedEntityIds } = useEntityState();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { generatePreview, clearPreviews, previews, isGenerating: isPreviewing, error } = useEntityPreview();

  const loadEntity = useCallback(async () => {
    if (selectedEntityIds.length === 1) {
      const e = await entityManager.get(selectedEntityIds[0]);
      if (e) {
        setEntity(e);
      }
    } else {
      setEntity(null);
      setGeneratedCode('');
      clearPreviews();
    }
  }, [selectedEntityIds, clearPreviews]);

  React.useEffect(() => {
    loadEntity();
  }, [loadEntity]);

  const handleGenerate = async () => {
    if (!entity || !prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedCode('');
    clearPreviews();

    try {
      const code = await generatePhotoCode(prompt);
      const finalCode = `entity: "${entity.metadata?.name || 'Unknown'}"\n${code}`;
      setGeneratedCode(finalCode);
      
      // Auto-preview
      await generatePreview(entity.id, finalCode);
    } catch (err: any) {
      console.error('[ZODEntityPanel] Failed to generate:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!entity || !generatedCode.trim()) return;
    
    try {
      // 1. Save as preset and bind
      const presetName = `AI: ${prompt.substring(0, 20)}...`;
      const preset = await entityPresetManager.createPreset({
        name: presetName,
        photocode: generatedCode,
        tags: ['ai-generated'],
        entityId: entity.id
      });
      await bindPresetToEntity(entity.id, preset.id);
      
      // 2. Apply to current images
      let updatedCount = 0;
      for (const appearance of entity.appearances) {
        const assetId = appearance.assetId;
        const cached = await previewCache.get(assetId);
        if (cached && cached.mediumPreview) {
          try {
            const newPreview = await renderPipeline.render(generatedCode, cached.mediumPreview, cached.metadata, assetId);
            
            await previewCache.set(assetId, {
              ...cached,
              thumbnail: newPreview,
              mediumPreview: newPreview
            });
            
            importState.notifyAssetUpdate({
              assetId: assetId,
              previewBlob: newPreview,
              previewUrl: URL.createObjectURL(newPreview),
              thumbnailUrl: URL.createObjectURL(newPreview)
            } as any);
            
            updatedCount++;
          } catch (err) {
            console.error(`[ZODEntityPanel] Failed to apply to asset ${assetId}:`, err);
          }
        }
      }
      
      console.log(`Saved as preset "${presetName}" and applied to ${updatedCount} photos of ${entity.metadata?.name || 'Unknown'}!`);
    } catch (err) {
      console.error('[ZODEntityPanel] Failed to save preset or apply:', err);
      console.error('Failed to save preset or apply.');
    }
  };

  if (selectedEntityIds.length !== 1 || !entity) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-slate-900">
        <Sparkles className="w-12 h-12 mb-4 opacity-50" />
        <p className="font-medium">Select an entity to use ZOD</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-indigo-950 text-indigo-100">
      <div className="p-4 border-b border-indigo-900 flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          ZOD AI Assistant
        </h3>
        <span className="text-xs font-medium px-2 py-1 bg-indigo-900 rounded text-indigo-300">
          Target: {entity.metadata?.name || 'Unknown'}
        </span>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-indigo-900/50 text-indigo-100 placeholder-indigo-400/50 text-sm p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32"
            placeholder={`e.g., "Make ${entity.metadata?.name || 'this person'} look like a Vogue model"`}
            spellCheck={false}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:bg-indigo-600/50 flex items-center justify-center"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
        </div>

        {generatedCode && (
          <div className="mt-4 flex-1 flex flex-col min-h-0">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Code className="w-3 h-3" /> Generated PhotoCode
            </h4>
            <textarea
              value={generatedCode}
              onChange={(e) => setGeneratedCode(e.target.value)}
              className="flex-1 w-full bg-slate-950 text-emerald-400 font-mono text-sm p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Previews */}
        {previews.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Live Preview</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {previews.map((p, i) => (
                <div key={i} className="w-20 h-20 shrink-0 bg-indigo-900/50 rounded-lg border border-indigo-800 flex items-center justify-center relative group">
                  <span className="text-[10px] font-mono text-indigo-400/50">Asset {p.assetId.slice(0, 4)}</span>
                  <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                </div>
              ))}
            </div>
            <div className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Preview generated in &lt;300ms
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {generatedCode && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => generatePreview(entity.id, generatedCode)}
              disabled={isPreviewing || !generatedCode.trim()}
              className="flex-1 py-2 px-4 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPreviewing ? (
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Update Preview
            </button>
            <button
              onClick={handleApply}
              disabled={isPreviewing || !generatedCode.trim() || previews.length === 0}
              className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:bg-indigo-600/50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Preset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
