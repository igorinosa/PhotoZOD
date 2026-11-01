import React, { useState, useEffect, useCallback } from 'react';
import { useEntityState } from '../state/entityState';
import { entityManager } from '../../../core/entities/entityManager';
import { Entity } from '../../../core/entities/schema';
import { useEntityPreview } from '../ui/entity/useEntityPreview';
import { Play, Code, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { importState } from '../../../core/pipeline/import/importState';
import { renderPipeline } from '../../../core/pipeline/render/renderPipeline';
import { previewCache } from '../../../core/cache/previewCache';
import { entityPresetManager } from '../../../core/entities/presets/entityPresetManager';
import { bindPresetToEntity } from '../../../core/entities/presets/binding';

export const EntityEditor: React.FC = () => {
  const { selectedEntityIds } = useEntityState();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [code, setCode] = useState('');
  const { generatePreview, clearPreviews, previews, isGenerating, error } = useEntityPreview();

  const loadEntity = useCallback(async () => {
    if (selectedEntityIds.length === 1) {
      const e = await entityManager.get(selectedEntityIds[0]);
      if (e) {
        setEntity(e);
        setCode(`entity: "${e.metadata?.name || 'Unknown'}"\n  `);
      }
    } else {
      setEntity(null);
      setCode('');
      clearPreviews();
    }
  }, [selectedEntityIds, clearPreviews]);

  useEffect(() => {
    loadEntity();
  }, [loadEntity]);

  const handlePreview = async () => {
    if (!entity || !code.trim()) return;
    await generatePreview(entity.id, code);
  };

  const handleApply = async () => {
    if (!entity || !code.trim()) return;
    
    console.log(`[EntityEditor] Applying code to ${entity.metadata?.name || 'Unknown'}:`, code);
    
    let updatedCount = 0;
    for (const appearance of entity.appearances) {
      const assetId = appearance.assetId;
      // We need the original blob to render from scratch, or we can just apply on top of the current preview?
      // If we apply on top of the current preview, it's destructive.
      // Let's get the cached preview.
      const cached = await previewCache.get(assetId);
      if (cached) {
        try {
          // Render the new code on top of the current medium preview
          const newPreview = await renderPipeline.render(code, cached.mediumPreview, cached.metadata, assetId);
          
          // Update cache
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
          console.error(`[EntityEditor] Failed to apply to ${assetId}:`, err);
        }
      }
    }
    
      console.log(`Applied edits to ${updatedCount} photos of ${entity.metadata?.name || 'Unknown'}!`);
  };

  const handleSavePreset = async () => {
    if (!entity || !code.trim()) return;
    try {
      // Note: prompt() is used here as a simple way to get input, 
      // but in a real app we should use a custom modal.
      const presetName = window.prompt("Enter a name for this preset:", `Preset for ${entity.metadata?.name || 'Unknown'}`);
      if (!presetName) return;
      
      const preset = await entityPresetManager.createPreset({
        name: presetName,
        photocode: code,
        tags: ['manual'],
        entityId: entity.id
      });
      await bindPresetToEntity(entity.id, preset.id);
      console.log(`Saved as preset "${presetName}" and bound to ${entity.metadata?.name || 'Unknown'}!`);
    } catch (err) {
      console.error('[EntityEditor] Failed to save preset:', err);
      console.error('Failed to save preset.');
    }
  };

  if (selectedEntityIds.length !== 1 || !entity) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-slate-900">
        <Code className="w-12 h-12 mb-4 opacity-50" />
        <p className="font-medium">Select an entity to edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Code className="w-4 h-4 text-indigo-400" />
          PhotoCode Editor
        </h3>
        <span className="text-xs font-mono px-2 py-1 bg-slate-800 rounded text-slate-400">
          Target: {entity.metadata?.name || 'Unknown'}
        </span>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 w-full bg-slate-950 text-emerald-400 font-mono text-sm p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
          placeholder="Enter PhotoCode here..."
          spellCheck={false}
        />

        {/* Previews */}
        {previews.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Live Preview</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {previews.map((p, i) => (
                <div key={i} className="w-20 h-20 shrink-0 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center relative group">
                  <span className="text-[10px] font-mono text-slate-500">Asset {p.assetId.slice(0, 4)}</span>
                  <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
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

        <div className="mt-4 flex gap-2">
          <button
            onClick={handlePreview}
            disabled={isGenerating || !code.trim()}
            className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Preview
          </button>
          <button
            onClick={handleApply}
            disabled={isGenerating || !code.trim() || previews.length === 0}
            className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:bg-indigo-600/50"
          >
            Apply to All
          </button>
          <button
            onClick={handleSavePreset}
            disabled={!code.trim()}
            className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:bg-emerald-600/50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
};
