import React, { useState, useEffect } from 'react';
import { EntityBrowser } from './EntityBrowser';
import { EntityDetail } from './EntityDetail';
import { EntityAppearances } from './EntityAppearances';
import { EntityEditor } from '../../editor/EntityEditor';
import { ZODEntityPanel } from './ZODEntityPanel';
import { EntityPresetPanel } from './EntityPresetPanel';
import { EntityActions } from './EntityActions';
import { useEntityState } from '../../state/entityState';
import { LayoutDashboard, Sparkles, Code, ArrowLeft, Image as ImageIcon, Info, Wand2, GitMerge } from 'lucide-react';
import { WorkflowRulesPanel } from './WorkflowRulesPanel';

export const EntityWorkspace: React.FC = () => {
  const { selectedEntityIds, clearSelection } = useEntityState();
  const [leftTab, setLeftTab] = useState<'browser' | 'rules'>('browser');
  const [activePanel, setActivePanel] = useState<'zod' | 'editor' | 'presets'>('zod');
  const [mobileTab, setMobileTab] = useState<'detail' | 'appearances' | 'editor' | 'presets'>('detail');

  // Reset mobile tab when selection changes
  useEffect(() => {
    if (selectedEntityIds.length === 1) {
      setMobileTab('detail');
    }
  }, [selectedEntityIds]);

  const isMobileDetailView = selectedEntityIds.length > 0;

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden font-sans relative">
      {/* Left Sidebar - Navigation (Hidden on mobile) */}
      <div className="hidden md:flex w-16 bg-slate-900 flex-col items-center py-6 gap-6 shrink-0 z-10 shadow-xl">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          PZ
        </div>
        <nav className="flex flex-col gap-4 mt-4">
          <button 
            onClick={() => setLeftTab('browser')}
            className={`p-3 rounded-xl transition-colors relative group ${leftTab === 'browser' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Entity Browser
            </span>
          </button>
          <button 
            onClick={() => setLeftTab('rules')}
            className={`p-3 rounded-xl transition-colors relative group ${leftTab === 'rules' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <GitMerge className="w-5 h-5" />
            <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Workflow Rules
            </span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${isMobileDetailView ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 flex min-h-0">
          {/* Entity Grid or Rules */}
          <div className="flex-1 min-w-0 border-r border-slate-200 shadow-sm z-0">
            {leftTab === 'browser' ? <EntityBrowser /> : <WorkflowRulesPanel />}
          </div>

          {/* Appearances Grid (Desktop only) */}
          {selectedEntityIds.length === 1 && (
            <div className="hidden lg:flex w-[300px] xl:w-[400px] shrink-0 border-r border-slate-200 bg-white shadow-sm z-10 flex-col">
              <EntityAppearances />
            </div>
          )}

          {/* Entity Details (Desktop only) */}
          <div className="hidden md:block shrink-0 z-20 shadow-sm">
            <EntityDetail />
          </div>
        </div>
      </div>

      {/* Right Sidebar - AI / Editor (Desktop only) */}
      <div className="hidden md:flex shrink-0 flex-col bg-slate-900 border-l border-slate-800 shadow-xl z-30 w-80 xl:w-96">
        <div className="flex items-center p-2 border-b border-slate-800 gap-2">
          <button
            onClick={() => setActivePanel('zod')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activePanel === 'zod' 
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> ZOD AI
          </button>
          <button
            onClick={() => setActivePanel('presets')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activePanel === 'presets' 
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" /> Presets
          </button>
          <button
            onClick={() => setActivePanel('editor')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activePanel === 'editor' 
                ? 'bg-slate-700 text-white shadow-md shadow-slate-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Editor
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {activePanel === 'zod' && <ZODEntityPanel />}
          {activePanel === 'presets' && <EntityPresetPanel />}
          {activePanel === 'editor' && <EntityEditor />}
        </div>
      </div>

      {/* Mobile Detail View */}
      {isMobileDetailView && (
        <div className="md:hidden absolute inset-0 bg-white z-40 flex flex-col">
          <div className="flex items-center p-4 border-b border-slate-200 bg-white shrink-0">
            <button onClick={clearSelection} className="p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-lg truncate flex-1">
              {selectedEntityIds.length === 1 ? 'Entity Details' : `${selectedEntityIds.length} Selected`}
            </h2>
          </div>
          
          {selectedEntityIds.length === 1 && (
            <div className="flex border-b border-slate-200 shrink-0">
              <button
                onClick={() => setMobileTab('detail')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'detail' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                <Info className="w-4 h-4" /> Info
              </button>
              <button
                onClick={() => setMobileTab('appearances')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'appearances' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                <ImageIcon className="w-4 h-4" /> Photos
              </button>
              <button
                onClick={() => setMobileTab('editor')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'editor' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                <Sparkles className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setMobileTab('presets')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'presets' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                <Wand2 className="w-4 h-4" /> Presets
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
            {selectedEntityIds.length > 1 ? (
              <EntityDetail />
            ) : (
              <>
                {mobileTab === 'detail' && <div className="flex-1 overflow-y-auto"><EntityDetail /></div>}
                {mobileTab === 'appearances' && <div className="flex-1 overflow-hidden flex flex-col"><EntityAppearances /></div>}
                {mobileTab === 'presets' && <div className="flex-1 overflow-hidden flex flex-col"><EntityPresetPanel /></div>}
                {mobileTab === 'editor' && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center p-2 bg-slate-900 gap-2 shrink-0">
                      <button
                        onClick={() => setActivePanel('zod')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          activePanel === 'zod' 
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> ZOD AI
                      </button>
                      <button
                        onClick={() => setActivePanel('editor')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          activePanel === 'editor' 
                            ? 'bg-slate-700 text-white shadow-md shadow-slate-900/20' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" /> Editor
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {activePanel === 'zod' ? <ZODEntityPanel /> : <EntityEditor />}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Actions */}
      <EntityActions />
    </div>
  );
};
