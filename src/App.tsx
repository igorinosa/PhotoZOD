/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import GridView from './apps/web/ui/library/GridView';
import { EntityWorkspace } from './apps/web/ui/entity/EntityWorkspace';
import { Image, Users } from 'lucide-react';
import { bootloader } from './core/storage/bootloader';
import { systemDB } from './core/storage/db';
import { useEditorStore } from './apps/web/state/editorStore';
import { useSettingsStore } from './apps/web/state/settingsStore';
import { importState } from './core/pipeline/import/importState';
import { trashEngine } from './core/trash/trashEngine';
import { ToastContainer } from './apps/web/ui/components/ToastContainer';
import { ImportPanel } from './apps/web/ui/import/ImportPanel';
import { errorReporter } from './apps/web/ui/errorReporter';

const ErrorPanel = lazy(() => import('./apps/web/ui/ErrorPanel'));

export default function App() {
  const [activeTab, setActiveTab] = useState<'library' | 'entities'>('library');
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    bootloader.boot().then(async () => {
      // Load settings
      await useSettingsStore.getState().loadSettings();
      
      // Run auto-delete
      const autoDeleteDays = useSettingsStore.getState().autoDeleteAfterDays;
      if (autoDeleteDays !== null) {
        trashEngine.autoDelete(autoDeleteDays);
      }

      // Restore UI State
      try {
        const uiState = await systemDB.getSystemData('uiState');
        if (uiState && uiState.currentAssetId) {
          const asset = importState.assets.find(a => a.assetId === uiState.currentAssetId);
          if (asset) {
            useEditorStore.getState().setCurrentAsset(asset);
            if (uiState.photocode) {
              useEditorStore.getState().setPhotoCode(uiState.photocode);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to restore UI state:', err);
      }
      setIsBooting(false);
      
      // Force full reprocess once after the fix
      const hasReprocessed = localStorage.getItem('face_pipeline_fix_v2');
      if (!hasReprocessed) {
        localStorage.setItem('face_pipeline_fix_v2', 'started');
        import('./core/face/faceProcessor').then(({ useFaceProcessor }) => {
          console.log('[App] Triggering mandatory full reprocess for face pipeline fix...');
          useFaceProcessor.getState().reprocessAll().then(() => {
            localStorage.setItem('face_pipeline_fix_v2', 'true');
            console.log('[App] Full reprocess completed.');
          });
        });
      }
    }).catch(err => {
      console.error('Bootloader failed:', err);
      errorReporter.report(`Bootloader failed: ${err.message || err}`, 'system');
      setIsBooting(false); // Still show UI, maybe with error state
    });
  }, []);

  if (isBooting) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading System State...</h2>
          <p className="text-zinc-400 mt-2">Restoring assets and entities</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col overflow-hidden">
      <header className="px-4 py-3 border-b border-zinc-800 flex flex-row justify-between items-center bg-zinc-900 shrink-0 gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-white">PhotoZOD</h1>
          <div className="hidden sm:block h-4 w-px bg-zinc-700 mx-2" />
          <p className="text-zinc-500 text-xs mt-0.5 hidden sm:block">Professional Photo Organizer</p>
        </div>
        <div className="flex bg-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'library' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Library</span>
          </button>
          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'entities' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Entities</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0 h-full bg-zinc-950">
        {activeTab === 'library' ? <GridView /> : <EntityWorkspace />}
      </main>
      
      <Suspense fallback={null}>
        <ErrorPanel />
      </Suspense>
      <ToastContainer />
      <ImportPanel />
    </div>
  );
}
