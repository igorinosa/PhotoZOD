import React, { useState, useEffect } from 'react';
import { workflowRulesEngine, Rule } from '../../../../core/entities/workflows/rules';
import { workflowTemplateManager } from '../../../../core/entities/workflows/templates';
import { Plus, Trash2, Save, Play, GitMerge } from 'lucide-react';

export const WorkflowRulesPanel: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState(workflowTemplateManager.getTemplates());
  
  const [newCondition, setNewCondition] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newRuleName, setNewRuleName] = useState('');

  useEffect(() => {
    setRules(workflowRulesEngine.getRules());
  }, []);

  const handleAddRule = () => {
    if (!newCondition || !newAction || !newRuleName) return;
    
    workflowRulesEngine.addRule({
      name: newRuleName,
      condition: newCondition,
      action: newAction
    });
    
    setRules([...workflowRulesEngine.getRules()]);
    setNewCondition('');
    setNewAction('');
    setNewRuleName('');
  };

  const handleDeleteRule = (id: string) => {
    workflowRulesEngine.removeRule(id);
    setRules([...workflowRulesEngine.getRules()]);
  };

  const handleApplyTemplate = (templateId: string) => {
    workflowTemplateManager.applyTemplate(templateId);
    setRules([...workflowRulesEngine.getRules()]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-indigo-500" />
            Workflow Rules Engine
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Automate edits based on entity properties during import.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        
        {/* Templates Section */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Workflow Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <div key={template.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900">{template.name}</h4>
                  <button 
                    onClick={() => handleApplyTemplate(template.id)}
                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Apply Template"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-4">{template.description}</p>
                <div className="text-xs font-mono text-slate-400">
                  {template.rules.length} rules included
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active Rules Section */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Active Rules</h3>
          
          <div className="flex flex-col gap-3 mb-6">
            {rules.length === 0 ? (
              <div className="text-center py-8 bg-slate-100 rounded-xl border border-slate-200 border-dashed text-slate-500">
                No active rules. Add one below or apply a template.
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between group">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 mb-1">{rule.name}</h4>
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200">
                        IF {rule.condition}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                        THEN {rule.action}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Rule */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4">Create Custom Rule</h4>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rule Name</label>
                <input 
                  type="text" 
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                  placeholder="e.g., Soften Bride Skin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Condition</label>
                  <input 
                    type="text" 
                    value={newCondition}
                    onChange={e => setNewCondition(e.target.value)}
                    placeholder="e.g., entity.tag == 'Bride'"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Action</label>
                  <input 
                    type="text" 
                    value={newAction}
                    onChange={e => setNewAction(e.target.value)}
                    placeholder="e.g., applyPreset('preset_id')"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddRule}
                disabled={!newCondition || !newAction || !newRuleName}
                className="mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
