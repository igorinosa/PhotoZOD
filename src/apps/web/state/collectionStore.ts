import { create } from 'zustand';
import { Collection, RuleNode } from '../../../core/collections/types';
import { evaluateCollection } from '../../../core/collections/collectionEngine';
import { subscribe } from '../../../core/collections/subscription';
import { SMART_COLLECTIONS } from '../../../core/collections/smartRegistry';

interface CollectionState {
  collections: (Collection & { results: string[] })[];
  activeCollectionId: string | null;
  
  // Actions
  setActiveCollection: (id: string | null) => void;
  addCollection: (name: string, rule: RuleNode) => string;
  deleteCollection: (id: string) => void;
  recomputeAll: () => void;
}

export const useCollectionStore = create<CollectionState>((set, get) => {
  // Initial Smart Collections
  const initialCollections = SMART_COLLECTIONS.map(sc => ({
    ...sc,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isSmart: true,
    readonly: true,
    results: Array.from(evaluateCollection(sc.rule))
  }));

  return {
    collections: initialCollections,
    activeCollectionId: null,

    setActiveCollection: (id) => set({ activeCollectionId: id }),

    addCollection: (name, rule) => {
      const now = Date.now();
      const id = `col_${now}_${name.replace(/\s+/g, '_').toLowerCase()}`;
      const newCollection = {
        id,
        name,
        rule,
        createdAt: now,
        updatedAt: now,
        isSmart: false,
        results: Array.from(evaluateCollection(rule))
      };
      
      set(state => ({
        collections: [...state.collections, newCollection]
      }));
      
      return id;
    },

    deleteCollection: (id) => set(state => ({
      collections: state.collections.filter(c => c.id !== id),
      activeCollectionId: state.activeCollectionId === id ? null : state.activeCollectionId
    })),

    recomputeAll: () => {
      const currentCollections = get().collections;
      let changed = false;
      
      const newCollections = currentCollections.map(col => {
        const resultSet = evaluateCollection(col.rule);
        const newResults = Array.from(resultSet).sort(); // Sort for stable comparison
        
        // Compare with current results (also sorted or just check equality)
        const currentResultsSorted = [...col.results].sort();
        
        if (currentResultsSorted.length === newResults.length && 
            currentResultsSorted.every((id, i) => id === newResults[i])) {
          return col;
        }
        
        changed = true;
        return { ...col, results: newResults };
      });

      if (changed) {
        set({ collections: newCollections });
      }
    }
  };
});

// Initialize subscription outside to ensure it only happens once and doesn't interfere with store creation
subscribe(() => {
  useCollectionStore.getState().recomputeAll();
});
