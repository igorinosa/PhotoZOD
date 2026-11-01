import { create } from 'zustand';
import { Entity } from '../../../core/entities/schema';

interface EntityState {
  selectedEntityIds: string[];
  searchQuery: string;
  filterTag: string | null;
  sortOrder: 'count_desc' | 'count_asc' | 'name_asc' | 'name_desc';
  
  // Actions
  selectEntity: (id: string, multi?: boolean) => void;
  deselectEntity: (id: string) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setFilterTag: (tag: string | null) => void;
  setSortOrder: (order: 'count_desc' | 'count_asc' | 'name_asc' | 'name_desc') => void;
}

export const useEntityState = create<EntityState>((set) => ({
  selectedEntityIds: [],
  searchQuery: '',
  filterTag: null,
  sortOrder: 'count_desc',

  selectEntity: (id, multi = false) => set((state) => {
    if (multi) {
      return {
        selectedEntityIds: state.selectedEntityIds.includes(id)
          ? state.selectedEntityIds.filter(eId => eId !== id)
          : [...state.selectedEntityIds, id]
      };
    }
    return { selectedEntityIds: [id] };
  }),

  deselectEntity: (id) => set((state) => ({
    selectedEntityIds: state.selectedEntityIds.filter(eId => eId !== id)
  })),

  clearSelection: () => set({ selectedEntityIds: [] }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setFilterTag: (tag) => set({ filterTag: tag }),
  
  setSortOrder: (order) => set({ sortOrder: order })
}));
