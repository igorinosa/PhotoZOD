import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, ChevronDown, Plus, Edit2, Trash2, X } from 'lucide-react';
import { usePresetStore } from '../../state/presetStore';
import { useCollectionStore } from '../../state/collectionStore';
import { useShallow } from 'zustand/react/shallow';
import { RuleNode } from '../../../../core/collections/types';

interface FilterPresetsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  advancedRule: RuleNode | null;
  setAdvancedRule: (rule: RuleNode | null) => void;
  formatFilter: string[];
  setFormatFilter: (filter: any) => void;
  isMobile?: boolean;
}

function compareArrays(a: string[] | null, b: string[] | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
}

function compareRuleNodes(a: RuleNode | null, b: RuleNode | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type) return false;

  if (a.type === 'condition' && b.type === 'condition') {
    return (
      a.field === b.field &&
      a.operator === b.operator &&
      a.value === b.value
    );
  }

  if (a.type === 'group' && b.type === 'group') {
    if (a.operator !== b.operator) return false;
    if (a.children.length !== b.children.length) return false;

    // Compare children safely
    return a.children.every((child, i) =>
      compareRuleNodes(child, b.children[i])
    );
  }

  return false;
}

export default function FilterPresets({
  searchQuery,
  setSearchQuery,
  advancedRule,
  setAdvancedRule,
  formatFilter,
  setFormatFilter,
  isMobile = false
}: FilterPresetsProps) {
  const { presets, activePresetId, setActivePresetId, removePreset } = usePresetStore(useShallow(state => ({
    presets: state.presets,
    activePresetId: state.activePresetId,
    setActivePresetId: state.setActivePresetId,
    removePreset: state.removePreset
  })));
  const { activeCollectionId, setActiveCollection } = useCollectionStore(useShallow(state => ({
    activeCollectionId: state.activeCollectionId,
    setActiveCollection: state.setActiveCollection
  })));
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const handleApplyPreset = (presetId: string) => {
    if (activePresetId === presetId) {
      // Clear preset
      setSearchQuery('');
      setAdvancedRule(null);
      setActiveCollection(null);
      setActivePresetId(null);
      setIsOpen(false);
      return;
    }

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    setSearchQuery(preset.searchQuery || '');
    setAdvancedRule(preset.rule);
    setFormatFilter(preset.formatFilter || []);
    if (preset.collectionId) {
      setActiveCollection(preset.collectionId);
    } else {
      setActiveCollection(null);
    }
    setActivePresetId(preset.id);
    setIsOpen(false);
  };

  const activePreset = presets.find(p => p.id === activePresetId);

  // Check if the current filter state has drifted from the active preset
  const isPresetDirty = React.useMemo(() => {
    if (!activePreset) return false;

    const queryMatches = (activePreset.searchQuery || '') === searchQuery;
    const collectionMatches = (activePreset.collectionId || null) === activeCollectionId;
    const formatMatches = compareArrays(activePreset.formatFilter, formatFilter);
    
    // Deep compare rules
    const rulesMatch = compareRuleNodes(activePreset.rule, advancedRule);

    return !queryMatches || !collectionMatches || !rulesMatch || !formatMatches;
  }, [activePreset, searchQuery, activeCollectionId, advancedRule, formatFilter]);

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all shrink-0 shadow-lg active:scale-95 ${
            activePresetId && !isPresetDirty
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/30'
              : activePresetId && isPresetDirty
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 shadow-amber-500/10'
              : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 shadow-black/20'
          }`}
        >
          <Bookmark size={16} />
          <span className="text-xs font-bold truncate max-w-[80px]">
            {activePreset ? (isPresetDirty ? `${activePreset.name}*` : activePreset.name) : 'Presets'}
          </span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && [
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />,
              <motion.div
                key="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-x-0 bottom-0 z-[101] bg-zinc-900 border-t border-zinc-800 rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              >
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-black text-white tracking-tight">Filter Presets</h3>
                  <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  {presets.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">No presets saved yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {presets.map(preset => (
                        <div key={preset.id} className="flex items-center gap-2">
                          <button
                            onClick={() => handleApplyPreset(preset.id)}
                            className={`flex-1 flex items-center justify-between p-4 rounded-xl border transition-all ${
                              activePresetId === preset.id && !isPresetDirty
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                                : activePresetId === preset.id && isPresetDirty
                                ? 'bg-amber-600/20 border-amber-500/50 text-amber-400'
                                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <span className="font-bold text-sm">{preset.name}</span>
                            {activePresetId === preset.id && <div className={`w-2 h-2 rounded-full ${isPresetDirty ? 'bg-amber-500' : 'bg-indigo-500'}`} />}
                          </button>
                          {isManageMode && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingPresetId(preset.id)}
                                className="p-4 text-indigo-400 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 bg-indigo-500/10"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => removePreset(preset.id)}
                                className="p-4 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/20 bg-red-500/10"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md shrink-0 space-y-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsSaveModalOpen(true);
                    }}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Plus size={18} />
                    Save Current Filter
                  </button>
                  {presets.length > 0 && (
                    <button
                      onClick={() => setIsManageMode(!isManageMode)}
                      className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} />
                      {isManageMode ? 'Done Managing' : 'Manage Presets'}
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 border border-zinc-800"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
          ]}
        </AnimatePresence>

        <PresetModal
          isOpen={isSaveModalOpen || editingPresetId !== null}
          onClose={() => {
            setIsSaveModalOpen(false);
            setEditingPresetId(null);
          }}
          currentSearchQuery={searchQuery}
          currentRule={advancedRule}
          currentCollectionId={activeCollectionId}
          currentFormatFilter={formatFilter}
          editingPresetId={editingPresetId}
        />
      </>
    );
  }

  // Desktop UI
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all shadow-lg active:scale-95 ${
            activePresetId && !isPresetDirty
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/30'
              : activePresetId && isPresetDirty
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 shadow-amber-500/10'
              : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-300 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 shadow-black/20'
          }`}
        >
          <Bookmark size={16} />
          <span className="text-sm font-bold tracking-wide">
            {activePreset ? (isPresetDirty ? `${activePreset.name} (modified)` : activePreset.name) : 'Presets'}
          </span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
              >
                <div className="p-3 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/50">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Filter Presets</span>
                  {presets.length > 0 && (
                    <button
                      onClick={() => setIsManageMode(!isManageMode)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider"
                    >
                      {isManageMode ? 'Done' : 'Manage'}
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {presets.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-zinc-500 italic">No presets yet</div>
                  ) : (
                    presets.map(preset => (
                      <div key={preset.id} className="flex items-center gap-1 group">
                        <button
                          onClick={() => handleApplyPreset(preset.id)}
                          className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                            activePresetId === preset.id && !isPresetDirty
                              ? 'bg-indigo-600/20 text-indigo-400'
                              : activePresetId === preset.id && isPresetDirty
                              ? 'bg-amber-600/20 text-amber-400'
                              : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{preset.name}</span>
                          {activePresetId === preset.id && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPresetDirty ? 'bg-amber-500' : 'bg-indigo-500'}`} />}
                        </button>
                        {isManageMode && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingPresetId(preset.id)}
                              className="p-2.5 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-colors"
                              title="Edit Preset"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => removePreset(preset.id)}
                              className="p-2.5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                              title="Delete Preset"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setIsSaveModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 transition-all shadow-lg shadow-black/20 active:scale-95"
      >
        <Plus size={16} />
        <span className="text-sm font-bold tracking-wide hidden sm:inline">Save Preset</span>
      </button>

      <PresetModal
        isOpen={isSaveModalOpen || editingPresetId !== null}
        onClose={() => {
          setIsSaveModalOpen(false);
          setEditingPresetId(null);
        }}
        currentSearchQuery={searchQuery}
        currentRule={advancedRule}
        currentCollectionId={activeCollectionId}
        currentFormatFilter={formatFilter}
        editingPresetId={editingPresetId}
      />
    </div>
  );
}

function PresetModal({
  isOpen,
  onClose,
  currentSearchQuery,
  currentRule,
  currentCollectionId,
  currentFormatFilter,
  editingPresetId
}: {
  isOpen: boolean;
  onClose: () => void;
  currentSearchQuery: string;
  currentRule: RuleNode | null;
  currentCollectionId: string | null;
  currentFormatFilter: string[];
  editingPresetId: string | null;
}) {
  const { presets, addPreset, editPreset } = usePresetStore(useShallow(state => ({
    presets: state.presets,
    addPreset: state.addPreset,
    editPreset: state.editPreset
  })));
  const [name, setName] = useState('');
  const [includeSearch, setIncludeSearch] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeCollection, setIncludeCollection] = useState(true);
  const [includeFormat, setIncludeFormat] = useState(true);

  React.useEffect(() => {
    if (isOpen) {
      if (editingPresetId) {
        const preset = presets.find(p => p.id === editingPresetId);
        if (preset) {
          setName(preset.name);
          setIncludeSearch(preset.searchQuery !== null);
          setIncludeFilters(preset.rule !== null);
          setIncludeCollection(preset.collectionId !== null);
          setIncludeFormat(preset.formatFilter !== null);
        }
      } else {
        setName('');
        setIncludeSearch(true);
        setIncludeFilters(true);
        setIncludeCollection(true);
        setIncludeFormat(true);
      }
    }
  }, [isOpen, editingPresetId, presets]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    
    if (editingPresetId) {
      editPreset(editingPresetId, {
        name: name.trim(),
        searchQuery: includeSearch ? currentSearchQuery : null,
        rule: includeFilters ? currentRule : null,
        collectionId: includeCollection ? currentCollectionId : null,
        formatFilter: includeFormat ? currentFormatFilter : null
      });
    } else {
      addPreset({
        name: name.trim(),
        searchQuery: includeSearch ? currentSearchQuery : null,
        rule: includeFilters ? currentRule : null,
        collectionId: includeCollection ? currentCollectionId : null,
        formatFilter: includeFormat ? currentFormatFilter : null
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-black text-white tracking-tight">{editingPresetId ? 'Edit Filter Preset' : 'Save Filter Preset'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Preset Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Wedding Best Shots"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Include in Preset</label>
            
            <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 bg-zinc-800/20 cursor-pointer hover:bg-zinc-800/40 transition-colors">
              <input
                type="checkbox"
                checked={includeSearch}
                onChange={e => setIncludeSearch(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 bg-zinc-900"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-200">Search Query</span>
                <span className="text-xs text-zinc-500 truncate max-w-[250px]">
                  {currentSearchQuery ? `"${currentSearchQuery}"` : 'None'}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 bg-zinc-800/20 cursor-pointer hover:bg-zinc-800/40 transition-colors">
              <input
                type="checkbox"
                checked={includeFilters}
                onChange={e => setIncludeFilters(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 bg-zinc-900"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-200">Advanced Filters</span>
                <span className="text-xs text-zinc-500">
                  {currentRule ? 'Active rules' : 'None'}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 bg-zinc-800/20 cursor-pointer hover:bg-zinc-800/40 transition-colors">
              <input
                type="checkbox"
                checked={includeCollection}
                onChange={e => setIncludeCollection(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 bg-zinc-900"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-200">Smart Collection</span>
                <span className="text-xs text-zinc-500">
                  {currentCollectionId ? currentCollectionId : 'None'}
                </span>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 bg-zinc-800/20 cursor-pointer hover:bg-zinc-800/40 transition-colors">
              <input
                type="checkbox"
                checked={includeFormat}
                onChange={e => setIncludeFormat(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 bg-zinc-900"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-200">File Format</span>
                <span className="text-xs text-zinc-500 uppercase tracking-widest">
                  {currentFormatFilter.length === 0 ? 'all' : currentFormatFilter.join(', ')}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
          >
            {editingPresetId ? 'Update Preset' : 'Save Preset'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
