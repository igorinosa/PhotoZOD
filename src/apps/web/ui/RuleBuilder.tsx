import React, { useState, useEffect } from 'react';
import { SmartImage } from './components/SmartImage';
import { Plus, Trash2, Save, Play, ChevronRight, ChevronDown, HelpCircle, X, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UIGroup, UICondition, compileUIRule, validateUIRule } from '../../../core/collections/ruleBuilder';
import { FIELDS } from '../../../core/collections/fieldRegistry';
import { OPERATORS } from '../../../core/collections/operatorRegistry';
import { useCollectionStore } from '../state/collectionStore';
import { runCollection } from '../../../core/collections/queryEngine';
import { importState } from '../../../core/pipeline/import/importState';
import { ImportedAsset } from '../../../core/pipeline/import/importManagerTypes';

interface RuleBuilderProps {
  onClose?: () => void;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ onClose }) => {
  const [name, setName] = useState('New Smart Collection');
  const [rootGroup, setRootGroup] = useState<UIGroup>({
    type: 'AND',
    conditions: [{ field: FIELDS[0].key, operator: '=', value: '' }]
  });
  const [previewResults, setPreviewResults] = useState<ImportedAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);
  
  const { addCollection } = useCollectionStore();

  useEffect(() => {
    try {
      const rule = compileUIRule(rootGroup);
      const assets = importState.assets;
      const results = runCollection(rule, assets) as ImportedAsset[];
      setPreviewResults(results);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [rootGroup]);

  const handleSave = () => {
    try {
      validateUIRule(rootGroup);
      const rule = compileUIRule(rootGroup);
      addCollection(name, rule);
      if (onClose) onClose();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const updateGroup = (path: number[], updates: Partial<UIGroup>) => {
    const newRoot = { ...rootGroup };
    let current: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      current = current.conditions[path[i]];
    }
    Object.assign(current, updates);
    setRootGroup(newRoot);
  };

  const addCondition = (path: number[]) => {
    const newRoot = { ...rootGroup };
    let current: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      current = current.conditions[path[i]];
    }
    current.conditions.push({ field: FIELDS[0].key, operator: '=', value: '' });
    setRootGroup(newRoot);
  };

  const addGroup = (path: number[]) => {
    const newRoot = { ...rootGroup };
    let current: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      current = current.conditions[path[i]];
    }
    current.conditions.push({ type: 'AND', conditions: [{ field: FIELDS[0].key, operator: '=', value: '' }] });
    setRootGroup(newRoot);
  };

  const removeAt = (path: number[], index: number) => {
    const newRoot = { ...rootGroup };
    let current: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      current = current.conditions[path[i]];
    }
    current.conditions.splice(index, 1);
    setRootGroup(newRoot);
  };

  const updateCondition = (path: number[], index: number, updates: Partial<UICondition>) => {
    const newRoot = { ...rootGroup };
    let current: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      current = current.conditions[path[i]];
    }
    current.conditions[index] = { ...current.conditions[index], ...updates };
    setRootGroup(newRoot);
  };

  const wizardSteps = [
    {
      title: "Welcome to Smart Collections",
      content: "Smart Collections automatically group your photos based on rules you define. They update instantly as your library grows.",
      icon: <Play className="w-12 h-12 text-indigo-500 mb-4" />
    },
    {
      title: "Create a Rule",
      content: "Start by choosing a property (like Date, Camera, or Tags), an operator (like 'is exactly' or 'contains'), and a value.",
      icon: <Plus className="w-12 h-12 text-indigo-500 mb-4" />
    },
    {
      title: "Combine Rules",
      content: "Use 'AND' to find photos that match ALL your rules, or 'OR' to find photos that match ANY of them. You can even create nested groups for complex searches!",
      icon: <HelpCircle className="w-12 h-12 text-indigo-500 mb-4" />
    },
    {
      title: "Preview and Save",
      content: "See the matching photos instantly at the bottom of the screen. Give your collection a name and save it to access it anytime from the sidebar.",
      icon: <Save className="w-12 h-12 text-indigo-500 mb-4" />
    }
  ];

  if (showWizard) {
    return (
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 max-w-2xl mx-auto overflow-hidden flex flex-col h-full max-h-[80vh]">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">How to use Smart Collections</h2>
          <button onClick={() => { setShowWizard(false); if (onClose) onClose(); }} className="text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizardStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center max-w-md"
            >
              {wizardSteps[wizardStep].icon}
              <h3 className="text-2xl font-bold text-white mb-4">{wizardSteps[wizardStep].title}</h3>
              <p className="text-zinc-400 text-lg leading-relaxed">
                {wizardSteps[wizardStep].content}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center">
          <div className="flex gap-2">
            {wizardSteps.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === wizardStep ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowWizard(false)}
              className="px-4 py-2 text-zinc-400 hover:text-white font-medium transition-colors"
            >
              Skip
            </button>
            {wizardStep < wizardSteps.length - 1 ? (
              <button 
                onClick={() => setWizardStep(s => s + 1)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                onClick={() => setShowWizard(false)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Get Started <Check size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full mx-auto flex flex-col h-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-zinc-800 gap-4 bg-zinc-950/50">
        <div className="flex-1 w-full">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-2xl sm:text-3xl font-bold text-white border-b-2 border-transparent focus:border-indigo-500 outline-none w-full bg-transparent placeholder-zinc-600 transition-colors"
            placeholder="Name your collection..."
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowWizard(true)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="How to use"
          >
            <HelpCircle size={20} />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors font-medium flex-1 sm:flex-none text-center"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex-1 sm:flex-none"
          >
            <Save size={18} />
            Save
          </button>
        </div>
      </div>

      {/* Rules Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-900">
        <div className="max-w-4xl mx-auto space-y-4">
          <GroupNode
            group={rootGroup}
            path={[]}
            onUpdateGroup={updateGroup}
            onAddCondition={addCondition}
            onAddGroup={addGroup}
            onRemoveAt={removeAt}
            onUpdateCondition={updateCondition}
            isRoot={true}
          />
        </div>
      </div>

      {/* Preview Area */}
      <div className="border-t border-zinc-800 bg-zinc-950 p-4 sm:p-6 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Play size={14} className="text-indigo-500" />
              Live Preview
            </h3>
            <span className="text-sm font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              {previewResults.length} {previewResults.length === 1 ? 'photo matches' : 'photos match'}
            </span>
          </div>
          
          {error && (
            <div className="p-3 mb-4 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {previewResults.slice(0, 10).map(asset => (
              <div key={asset.assetId} className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 relative group snap-start">
                <SmartImage 
                  src={asset?.thumbnailUrl || asset?.previewUrl} 
                  assetId={asset?.assetId}
                  alt={asset?.fileName} 
                  className="w-full h-full object-cover" 
                  retryCount={5}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-[10px] sm:text-xs text-white truncate w-full">{asset.fileName}</span>
                </div>
              </div>
            ))}
            {previewResults.length > 10 && (
              <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-zinc-800/50 rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-400 snap-start">
                <span className="text-xl font-light">+{previewResults.length - 10}</span>
                <span className="text-xs">more</span>
              </div>
            )}
            {previewResults.length === 0 && !error && (
              <div className="w-full py-8 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                <p className="text-sm">No photos match these rules</p>
                <p className="text-xs mt-1 opacity-70">Try adjusting your conditions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface GroupNodeProps {
  group: UIGroup;
  path: number[];
  onUpdateGroup: (path: number[], updates: Partial<UIGroup>) => void;
  onAddCondition: (path: number[]) => void;
  onAddGroup: (path: number[]) => void;
  onRemoveAt: (path: number[], index: number) => void;
  onUpdateCondition: (path: number[], index: number, updates: Partial<UICondition>) => void;
  isRoot?: boolean;
}

const GroupNode: React.FC<GroupNodeProps> = ({
  group,
  path,
  onUpdateGroup,
  onAddCondition,
  onAddGroup,
  onRemoveAt,
  onUpdateCondition,
  isRoot = false
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-xl border relative transition-colors ${isRoot ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-900 border-zinc-700/50 mt-4'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400 font-medium">Match</span>
          <select
            value={group.type}
            onChange={(e) => onUpdateGroup(path, { type: e.target.value as 'AND' | 'OR' })}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow cursor-pointer"
          >
            <option value="AND">ALL</option>
            <option value="OR">ANY</option>
          </select>
          <span className="text-sm text-zinc-400 font-medium">of the following rules:</span>
        </div>
        
        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={() => onAddCondition(path)}
            className="text-xs font-medium flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors flex-1 sm:flex-none"
          >
            <Plus size={14} />
            Rule
          </button>
          <button
            onClick={() => onAddGroup(path)}
            className="text-xs font-medium flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors flex-1 sm:flex-none"
          >
            <Plus size={14} />
            Group
          </button>
        </div>
      </div>

      <div className="space-y-3 pl-2 sm:pl-6 border-l-2 border-zinc-700/50 ml-2 sm:ml-0">
        <AnimatePresence initial={false}>
          {group.conditions.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              className="flex items-start gap-2 sm:gap-3"
            >
              <div className="flex-1 min-w-0">
                {"conditions" in item ? (
                  <GroupNode
                    group={item as UIGroup}
                    path={[...path, index]}
                    onUpdateGroup={onUpdateGroup}
                    onAddCondition={onAddCondition}
                    onAddGroup={onAddGroup}
                    onRemoveAt={onRemoveAt}
                    onUpdateCondition={onUpdateCondition}
                  />
                ) : (
                  <ConditionRow
                    condition={item as UICondition}
                    onUpdate={(updates) => onUpdateCondition(path, index, updates)}
                  />
                )}
              </div>
              <button
                onClick={() => onRemoveAt(path, index)}
                className="mt-2 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                title="Remove rule"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {group.conditions.length === 0 && (
          <div className="py-6 text-center text-zinc-500 text-sm italic bg-zinc-950/30 rounded-lg border border-dashed border-zinc-800">
            No rules in this group. Add a rule to start matching photos.
          </div>
        )}
      </div>
    </div>
  );
};

interface ConditionRowProps {
  condition: UICondition;
  onUpdate: (updates: Partial<UICondition>) => void;
}

const ConditionRow: React.FC<ConditionRowProps> = ({ condition, onUpdate }) => {
  const selectedField = FIELDS.find(f => f.key === condition.field) || FIELDS[0];
  const operators = OPERATORS[selectedField.type] || ["="];

  // Ensure operator is valid for current field type
  useEffect(() => {
    if (!operators.includes(condition.operator)) {
      onUpdate({ operator: operators[0] });
    }
  }, [condition.field, operators, condition.operator, onUpdate]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 shadow-sm w-full">
      <div className="flex-1 sm:flex-none sm:w-1/3 min-w-[140px]">
        <select
          value={condition.field}
          onChange={(e) => {
            const newField = FIELDS.find(f => f.key === e.target.value)!;
            onUpdate({ field: e.target.value, operator: OPERATORS[newField.type][0], value: '' });
          }}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow cursor-pointer"
        >
          {FIELDS.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 sm:flex-none sm:w-1/4 min-w-[120px]">
        <select
          value={condition.operator}
          onChange={(e) => onUpdate({ operator: e.target.value })}
          className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow cursor-pointer"
        >
          {operators.map(op => (
            <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px]">
        {["exists", "not_exists"].includes(condition.operator) ? (
          <div className="w-full px-3 py-2 text-sm text-zinc-500 italic bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            No value required
          </div>
        ) : selectedField.type === 'enum' ? (
          <select
            value={condition.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow cursor-pointer"
          >
            <option value="" disabled>Select a value...</option>
            {selectedField.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : selectedField.type === 'date' ? (
          <input
            type="date"
            value={condition.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
        ) : selectedField.type === 'number' ? (
          <input
            type="number"
            value={condition.value}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow placeholder-zinc-600"
            placeholder="Enter a number..."
          />
        ) : (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow placeholder-zinc-600"
            placeholder="Enter text..."
          />
        )}
      </div>
    </div>
  );
};

