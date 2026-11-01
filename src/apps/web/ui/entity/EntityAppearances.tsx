import React, { useState, useEffect, useCallback } from 'react';
import { Grid } from 'react-window';
import { AutoSizer } from '../components/AutoSizer';
import { entityManager } from '../../../../core/entities/entityManager';
import { Entity } from '../../../../core/entities/schema';
import { useEntityState } from '../../state/entityState';
import { Image as ImageIcon, Maximize2 } from 'lucide-react';

const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 200;

export const EntityAppearances: React.FC = () => {
  const { selectedEntityIds } = useEntityState();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [assets, setAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAppearances = useCallback(async () => {
    if (selectedEntityIds.length === 1) {
      setLoading(true);
      try {
        const e = await entityManager.get(selectedEntityIds[0]);
        if (e) {
          setEntity(e);
          // In a real app, we'd fetch actual asset URLs here. 
          // For now, we just use the asset IDs.
          const appearances = e.appearances || [];
          const uniqueAssets = Array.from(new Set(appearances.map(a => a.assetId)));
          setAssets(uniqueAssets);
        }
      } catch (err) {
        console.error('[EntityAppearances] Failed to load appearances:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setEntity(null);
      setAssets([]);
    }
  }, [selectedEntityIds]);

  useEffect(() => {
    loadAppearances();
  }, [loadAppearances]);

  const Cell = ({ columnIndex, rowIndex, style, items, columnCount }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    const assetId = items[index];

    if (!assetId) return null;

    return (
      <div style={style} className="p-1">
        <div className="h-full w-full bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative group cursor-pointer hover:border-indigo-400 transition-colors">
          {/* Placeholder for actual image */}
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <ImageIcon className="w-8 h-8 opacity-50" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs font-mono truncate">{assetId}</p>
          </div>
          <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  if (selectedEntityIds.length !== 1) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          {entity?.metadata?.name} <span className="text-slate-400 font-normal text-sm">({assets.length} photos)</span>
        </h2>
      </div>
      <div className="flex-1 p-3">
        {assets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p>No appearances found</p>
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => {
              const columnCount = Math.max(1, Math.floor(width / COLUMN_WIDTH));
              const rowCount = Math.ceil(assets.length / columnCount);
              
              return (
                <Grid
                  columnCount={columnCount}
                  columnWidth={width / columnCount}
                  rowCount={rowCount}
                  rowHeight={ROW_HEIGHT}
                  cellComponent={Cell}
                  cellProps={{ items: assets, columnCount }}
                  style={{ height, width }}
                />
              );
            }}
          </AutoSizer>
        )}
      </div>
    </div>
  );
};
