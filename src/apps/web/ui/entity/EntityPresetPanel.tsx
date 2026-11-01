import React, { useState, useEffect, useCallback } from 'react';
import { entityPresetManager, EntityPreset } from '../../../../core/entities/presets/entityPresetManager';
import { useEntityState } from '../../state/entityState';
import { entityManager } from '../../../../core/entities/entityManager';
import { Save, Edit2, Trash2, Wand2, History, RotateCcw } from 'lucide-react';
import { generatePresetFromPrompt } from '../../../../core/zod/presetGenerator';
import { presetVersioningSystem, PresetVersion } from '../../../../core/entities/presets/versioning';
import { bindPresetToEntity } from '../../../../core/entities/presets/binding';

export const EntityPresetPanel: React.FC = () => {
  const { selectedEntityIds } = useEntityState();
  const [presets, setPresets] = useState<EntityPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingPreset, setEditingPreset] = useState<EntityPreset | null>(null);
  const [editCode, setEditCode] = useState('');
  const [versions, setVersions] = useState<PresetVersion[]>([]);
  const [allPresets, setAllPresets] = useState<EntityPreset[]>([]);
  const [showAllPresets, setShowAllPresets] = useState(false);

  const loadPresets = useCallback(async () => {
    if (selectedEntityIds.length === 1) {
      setLoading(true);
      try {
        const entityId = selectedEntityIds[0];
        const loaded = await entityPresetManager.getPresetsByEntity(entityId);
        setPresets(loaded);
        
        const all = await entityPresetManager.getAllPresets();
        setAllPresets(all.filter(p => !loaded.some(l => l.id === p.id)));
      } catch (err) {
        console.error('Failed to load presets:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setPresets([]);
    }
  }, [selectedEntityIds]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleGenerate = async () => {
    if (!aiPrompt.trim() || selectedEntityIds.length !== 1) return;
    setIsGenerating(true);
    try {
      const entityId = selectedEntityIds[0];
      const entity = await entityManager.get(entityId);
      if (!entity) throw new Error("Entity not found");

      await generatePresetFromPrompt(aiPrompt, entityId, entity.metadata?.name || entityId);
      setAiPrompt('');
      await loadPresets();
    } catch (err) {
      console.error('Failed to generate preset:', err);
      console.error('Failed to generate preset.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) return;
    try {
      await entityPresetManager.deletePreset(id);
      await loadPresets();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  const handleEdit = async (preset: EntityPreset) => {
    setEditingPreset(preset);
    setEditCode(preset.photocode);
    const v = await presetVersioningSystem.getVersions(preset.id);
    setVersions(v);
  };

  const handleSaveEdit = async () => {
    if (!editingPreset) return;
    try {
      await presetVersioningSystem.trackVersion(editingPreset, 'edit_start');
      await entityPresetManager.updatePreset(editingPreset.id, { photocode: editCode });
      const updated = await entityPresetManager.getPreset(editingPreset.id);
      if (updated) await presetVersioningSystem.trackVersion(updated, 'edit_complete');
      
      setEditingPreset(null);
      await loadPresets();
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const handleRevert = async (version: number) => {
    if (!editingPreset) return;
    if (!confirm(`Are you sure you want to revert to version ${version}?`)) return;
    try {
      await presetVersioningSystem.revertPreset(editingPreset.id, version);
      const updated = await entityPresetManager.getPreset(editingPreset.id);
      if (updated) {
        setEditCode(updated.photocode);
        const v = await presetVersioningSystem.getVersions(editingPreset.id);
        setVersions(v);
      }
    } catch (err) {
      console.error('Failed to revert preset:', err);
    }
  };

  const handleBindExisting = async (presetId: string) => {
    if (selectedEntityIds.length !== 1) return;
    try {
      await bindPresetToEntity(selectedEntityIds[0], presetId);
      await loadPresets();
      setShowAllPresets(false);
    } catch (err) {
      console.error('Failed to bind preset:', err);
      console.error('Failed to bind preset.');
    }
  };

  if (selectedEntityIds.length !== 1) {
    return (
      <div className="p-6 text-center text-slate-400 h-full flex items-center justify-center">
        Select a single entity to view and manage its presets.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-y-auto">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
          Entity Presets
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Presets bound to this entity are automatically applied when the entity is detected.
        </p>

        {/* AI Generation Input */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="e.g., Make skin softer and brighter..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-500"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !aiPrompt.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
            title="Generate AI Preset"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
          </button>
        </div>

        <button
          onClick={() => setShowAllPresets(!showAllPresets)}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          {showAllPresets ? 'Hide Existing Presets' : 'Browse Existing Presets'}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {showAllPresets && (
          <div className="mb-6 pb-6 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Available Presets
            </h3>
            {allPresets.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-2">No other presets available.</div>
            ) : (
              <div className="space-y-2">
                {allPresets.map(preset => (
                  <div key={preset.id} className="flex items-center justify-between p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                    <span className="text-sm text-slate-300 truncate pr-2">{preset.name}</span>
                    <button
                      onClick={() => handleBindExisting(preset.id)}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-slate-400 py-4">Loading presets...</div>
        ) : presets.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-4">
            No presets bound to this entity yet.
          </div>
        ) : (
          presets.map(preset => (
            <div key={preset.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <span className="font-medium text-sm text-slate-200 truncate pr-2">
                  {preset.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(preset)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {editingPreset?.id === preset.id ? (
                <div className="p-3 bg-slate-900/80">
                  <textarea
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full h-32 bg-transparent text-indigo-300 font-mono text-xs focus:outline-none resize-none"
                    spellCheck={false}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setEditingPreset(null)}
                      className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" /> Save
                    </button>
                  </div>

                  {/* Versions */}
                  {versions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <History className="w-3 h-3" /> Version History
                      </h4>
                      <div className="space-y-1">
                        {versions.slice().reverse().map(v => (
                          <div key={v.version} className="flex items-center justify-between text-xs p-1.5 bg-slate-800/50 rounded border border-slate-700/50">
                            <span className="text-slate-400">v{v.version} - {v.action}</span>
                            <button
                              onClick={() => handleRevert(v.version)}
                              className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                              title="Revert"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-900/80 overflow-x-auto">
                  <pre className="text-xs font-mono text-indigo-300 m-0">
                    {preset.photocode}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
