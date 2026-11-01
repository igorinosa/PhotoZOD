import { create } from 'zustand';
import { ImportedAsset } from '../../../core/pipeline/import/importManagerTypes';
import { historyEngine } from '../../../core/state/history';
import { createSnapshot } from '../../../core/state/snapshot';
import { systemDB } from '../../../core/storage/db';
import { renderPipeline } from '../../../core/pipeline/render/renderPipeline';

export interface EditorState {
  currentAsset: ImportedAsset | null;
  photocode: string;
  history: string[];
  historyIndex: number;
  
  // Actions
  setCurrentAsset: (asset: ImportedAsset | null) => void;
  setPhotoCode: (code: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentAsset: null,
  photocode: '',
  history: [''],
  historyIndex: 0,

  setCurrentAsset: (asset) => {
    historyEngine.clear();
    set({ currentAsset: asset, photocode: '', history: [''], historyIndex: 0 });
    systemDB.saveSystemData('uiState', {
      currentAssetId: asset?.assetId,
      photocode: '',
      lastUpdated: Date.now()
    }).catch(console.error);
  },
  
  setPhotoCode: (code) => {
    const state = get();
    if (code === state.photocode) return;
    
    // Truncate future history if we're making a new edit after undoing
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(code);
    
    // Keep max 50 history states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    // Use history engine
    if (state.currentAsset) {
      renderPipeline.compilePhotoCode(code, state.currentAsset.assetId).then(ops => {
        historyEngine.push(createSnapshot(state.currentAsset!.assetId, ops));
      }).catch(e => {
        // Ignore syntax errors while typing
      });
    }
    
    // Save session
    systemDB.saveSystemData('uiState', {
      currentAssetId: state.currentAsset?.assetId,
      photocode: code,
      lastUpdated: Date.now()
    }).catch(console.error);
    
    set({
      photocode: code,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const newCode = state.history[newIndex];
      
      // Use history engine
      historyEngine.undo();
      
      set({
        photocode: newCode,
        historyIndex: newIndex
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const newCode = state.history[newIndex];
      
      // Use history engine
      historyEngine.redo();
      
      set({
        photocode: newCode,
        historyIndex: newIndex
      });
    }
  }
}));
