import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Grid } from 'react-window';
import { SmartImage } from '../components/SmartImage';
import { AutoSizer } from '../components/AutoSizer';
import { entityManager } from '../../../../core/entities/entityManager';
import { Entity } from '../../../../core/entities/schema';
import { entityEventBus } from '../../../../core/events/entityEvents';
import { useEntityState } from '../../state/entityState';
import { Search, Filter, Users, User, Wand2 } from 'lucide-react';
import { detectMerges, MergeSuggestion } from '../../../../core/entities/mergeEngine';
import { mergeEntities } from '../../../../core/entities/merge';

const COLUMN_WIDTH = 180;
const ROW_HEIGHT = 220;

export const EntityBrowser: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);

  const {
    searchQuery,
    setSearchQuery,
    filterTag,
    setFilterTag,
    sortOrder,
    setSortOrder,
    selectedEntityIds,
    selectEntity
  } = useEntityState();

  const loadEntities = useCallback(async () => {
    try {
      const allEntities = await entityManager.getAll();
      setEntities(allEntities);
    } catch (err) {
      console.error('[EntityBrowser] Failed to load entities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntities();

    const unsubCreated = entityEventBus.subscribe('ENTITY_CREATED', loadEntities);
    const unsubUpdated = entityEventBus.subscribe('ENTITY_UPDATED', loadEntities);
    const unsubDeleted = entityEventBus.subscribe('ENTITY_DELETED', loadEntities);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [loadEntities]);

  const filteredAndSortedEntities = useMemo(() => {
    let result = [...entities];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.metadata?.name?.toLowerCase().includes(lowerQuery) ||
        e.id.toLowerCase().includes(lowerQuery)
      );
    }

    if (filterTag) {
      result = result.filter(e => e.metadata.tags?.includes(filterTag));
    }

    result.sort((a, b) => {
      switch (sortOrder) {
        case 'count_desc':
          return (b.appearances?.length || 0) - (a.appearances?.length || 0);
        case 'count_asc':
          return (a.appearances?.length || 0) - (b.appearances?.length || 0);
        case 'name_asc':
          return (a.metadata?.name || '').localeCompare(b.metadata?.name || '');
        case 'name_desc':
          return (b.metadata?.name || '').localeCompare(a.metadata?.name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [entities, searchQuery, filterTag, sortOrder]);

  const Cell = ({ columnIndex, rowIndex, style, items, columnCount }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    const entity = items[index];

    if (!entity) return null;

    const isSelected = selectedEntityIds.includes(entity.id);

    return (
      <div style={style} className="p-2">
        <div 
          onClick={(e) => selectEntity(entity.id, e.metaKey || e.ctrlKey)}
          className={`
            h-full w-full rounded-xl border overflow-hidden cursor-pointer transition-all
            flex flex-col bg-white hover:shadow-md
            ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'}
          `}
        >
          <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
            {entity.metadata?.thumbnailUrl ? (
              <SmartImage 
                src={entity.metadata?.thumbnailUrl} 
                assetId={entity.appearances[0]?.assetId}
                alt={entity.metadata?.name}
                className="w-full h-full object-cover"
                retryCount={5}
              />
            ) : (
              <User className="w-12 h-12 text-slate-300" />
            )}
            
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-100">
            <h3 className="font-medium text-slate-900 truncate">
              {entity.metadata?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {entity.appearances?.length || 0} photos
            </p>
          </div>
        </div>
      </div>
    );
  };

  const handleDetectMerges = async () => {
    setIsDetecting(true);
    try {
      const results = await detectMerges(entities);
      setSuggestions(results);
      if (results.length > 0) {
        if (confirm(`Found ${results.length} merge suggestions. Auto-merge them?`)) {
          let mergedCount = 0;
          for (const s of results) {
            try {
              await mergeEntities(s.entityA, s.entityB);
              mergedCount++;
            } catch (e) {
              console.error("Failed to merge", s, e);
            }
          }
          console.log(`Successfully merged ${mergedCount} entities.`);
        }
      } else {
        console.log("No merge suggestions found.");
      }
    } catch (err) {
      console.error("Failed to detect merges", err);
      console.error("Error detecting merges.");
    } finally {
      setIsDetecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-500 font-medium">Loading Entities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toolbar */}
      <div className="py-3 px-4 sm:h-16 border-b border-slate-200 bg-white sm:px-6 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:flex-1 sm:max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-slate-50 sm:bg-transparent border sm:border-none border-slate-200 rounded-lg sm:rounded-none px-2 py-2 sm:p-0 text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="count_desc">Most Photos</option>
              <option value="count_asc">Least Photos</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
        
        <div className="text-xs sm:text-sm font-medium text-slate-500 w-full sm:w-auto text-right flex items-center justify-end gap-4">
          <button
            onClick={handleDetectMerges}
            disabled={isDetecting}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDetecting ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Auto-Merge
          </button>
          <span>{filteredAndSortedEntities.length} Entities</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-4">
        {filteredAndSortedEntities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">No entities found</p>
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => {
              const columnCount = Math.floor(width / COLUMN_WIDTH);
              const rowCount = Math.ceil(filteredAndSortedEntities.length / columnCount);
              
              return (
                <Grid
                  columnCount={columnCount}
                  columnWidth={width / columnCount}
                  rowCount={rowCount}
                  rowHeight={ROW_HEIGHT}
                  cellComponent={Cell}
                  cellProps={{ items: filteredAndSortedEntities, columnCount }}
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
