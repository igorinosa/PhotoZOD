import { Version } from '../../shared/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VersionStoreState {
  versions: Record<string, Version>;
  addVersion: (version: Version) => void;
  getVersion: (id: string) => Version | undefined;
  getVersionsForAsset: (assetId: string) => Version[];
  deleteVersionsForAsset: (assetId: string) => void;
  getAllVersions: () => Version[];
}

export const useVersionStore = create<VersionStoreState>()(
  persist(
    (set, get) => ({
      versions: {},
      
      addVersion: (version) => {
        set((state) => ({
          versions: {
            ...state.versions,
            [version.id]: version
          }
        }));
      },
      
      getVersion: (id) => {
        return get().versions[id];
      },
      
      getVersionsForAsset: (assetId) => {
        return Object.values(get().versions).filter(v => v.assetId === assetId);
      },
      
      deleteVersionsForAsset: (assetId) => {
        set((state) => {
          const newVersions = { ...state.versions };
          for (const id in newVersions) {
            if (newVersions[id].assetId === assetId) {
              delete newVersions[id];
            }
          }
          return { versions: newVersions };
        });
      },

      getAllVersions: () => {
        return Object.values(get().versions);
      }
    }),
    {
      name: 'dam-version-store',
      version: 1,
    }
  )
);

// Non-react export for core logic
export const versionStore = {
  addVersion: (version: Version) => useVersionStore.getState().addVersion(version),
  getVersion: (id: string) => useVersionStore.getState().getVersion(id),
  getVersionsForAsset: (assetId: string) => useVersionStore.getState().getVersionsForAsset(assetId),
  deleteVersionsForAsset: (assetId: string) => useVersionStore.getState().deleteVersionsForAsset(assetId),
  getAllVersions: () => useVersionStore.getState().getAllVersions(),
};
