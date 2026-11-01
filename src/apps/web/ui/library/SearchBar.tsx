import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, SlidersHorizontal, User } from 'lucide-react';
import { ImportedAsset, PersonEntity } from '../../../../shared/types';
import { RuleNode } from '../../../../core/collections/types';
import { motion, AnimatePresence } from 'motion/react';
import FilterPresets from './FilterPresets';
import { entityStore } from '../../../../core/entities/entityStore';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  parsedRule: RuleNode | null;
  renderRulePreview: (rule: RuleNode) => React.ReactNode;
  assets: ImportedAsset[];
  statusFilter: string;
  setStatusFilter: (status: any) => void;
  advancedRule: RuleNode | null;
  setAdvancedRule: (rule: RuleNode | null) => void;
  formatFilter: string[];
  setFormatFilter: (filter: any) => void;
  onOpenCollections?: () => void;
}

const STATIC_SUGGESTIONS = ['picked', 'rejected', 'unflagged', 'red', 'green', 'blue', '1 star', '2 star', '3 star', '4 star', '5 star', 'portrait', 'recent', 'trash', 'keep', 'duplicates'];
const QUICK_CHIPS = ['picked', 'rejected', 'wedding', 'portrait', 'red', '5 star', 'recent', 'duplicates'];

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  parsedRule,
  renderRulePreview,
  assets,
  statusFilter,
  setStatusFilter,
  advancedRule,
  setAdvancedRule,
  formatFilter,
  setFormatFilter,
  onOpenCollections
}: SearchBarProps) {
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch {
      return [];
    }
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [advColor, setAdvColor] = useState<string>('');
  const [advRating, setAdvRating] = useState<string>('');
  const [advDate, setAdvDate] = useState<string>('');
  const [advType, setAdvType] = useState<string>('');
  const [people, setPeople] = useState<PersonEntity[]>([]);

  useEffect(() => {
    entityStore.getAll().then(setPeople);
  }, []);

  useEffect(() => {
    if (!isAdvancedOpen) {
      setAdvColor('');
      setAdvRating('');
      setAdvDate('');
      setAdvType('');
      setAdvancedRule(null);
      return;
    }

    const conditions: RuleNode[] = [];

    if (advColor) {
      conditions.push({ type: 'condition', field: 'colorTag', operator: '=', value: advColor });
    }

    if (advRating) {
      const ratingVal = parseInt(advRating.split(' ')[0], 10);
      if (advRating.includes('+')) {
        conditions.push({ type: 'condition', field: 'rating', operator: '>', value: ratingVal - 1 });
      } else {
        conditions.push({ type: 'condition', field: 'rating', operator: '=', value: ratingVal });
      }
    }

    if (advDate) {
      if (advDate === 'today') {
        conditions.push({ type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (24 * 60 * 60 * 1000) });
      } else if (advDate === 'yesterday') {
        conditions.push({ type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (2 * 24 * 60 * 60 * 1000) });
      } else if (advDate === 'recent') {
        conditions.push({ type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (7 * 24 * 60 * 60 * 1000) });
      }
    }

    if (advType) {
      if (advType === 'portrait') {
        conditions.push({ type: 'condition', field: 'ai.faces', operator: 'length>', value: 0 });
      } else if (advType === 'duplicates') {
        conditions.push({ type: 'condition', field: 'duplicateGroupId', operator: '!=', value: null });
      }
    }

    if (conditions.length === 0) {
      setAdvancedRule(null);
    } else if (conditions.length === 1) {
      setAdvancedRule(conditions[0]);
    } else {
      setAdvancedRule({ type: 'group', operator: 'AND', children: conditions });
    }
  }, [advColor, advRating, advDate, advType, isAdvancedOpen, setAdvancedRule]);

  const userTags = useMemo(() => {
    const tags = new Set<string>();
    assets.forEach(a => {
      // These are user-applied tags, despite the 'ai' namespace
      if (a.ai?.tags) {
        a.ai.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags);
  }, [assets]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions(searchHistory);
      return;
    }
    const words = searchQuery.toLowerCase().split(/\s+/);
    const lastWord = words[words.length - 1];
    if (!lastWord) {
      setSuggestions([]);
      return;
    }
    
    const matches = Array.from(new Set([...userTags, ...STATIC_SUGGESTIONS]))
      .filter(s => s.toLowerCase().startsWith(lastWord) && s.toLowerCase() !== lastWord)
      .slice(0, 5);
      
    // Add people matches
    const peopleMatches = people
      .filter(p => p.name && p.name.toLowerCase().startsWith(lastWord))
      .map(p => `person:${p.name}`)
      .slice(0, 3);
      
    setSuggestions([...peopleMatches, ...matches]);
  }, [searchQuery, userTags, searchHistory, people]);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleChipToggle = (chip: string) => {
    const isActive = searchQuery.toLowerCase().includes(chip);
    if (isActive) {
      setSearchQuery(searchQuery.replace(new RegExp(`\\b${chip}\\b`, 'gi'), '').replace(/\s+/g, ' ').trim());
    } else {
      setSearchQuery((searchQuery + ' ' + chip).trim());
    }
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col w-full bg-zinc-900/40 backdrop-blur-md">
      <div className="px-4 sm:px-6 py-3 flex flex-row items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search photos, tags, or metadata..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addToHistory(searchQuery);
                setShowSuggestions(false);
              }
            }}
            className="w-full bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700/50 rounded-2xl pl-11 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 text-zinc-100 placeholder-zinc-600 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all active:scale-90"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className={`p-2.5 rounded-2xl border transition-all shrink-0 flex items-center justify-center shadow-lg active:scale-95 ${
            isAdvancedOpen 
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/30' 
              : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 shadow-black/20'
          }`}
          title="Advanced Search"
        >
          <SlidersHorizontal size={18} />
        </button>

        <div className="hidden sm:block shrink-0">
          <FilterPresets
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            advancedRule={advancedRule}
            setAdvancedRule={setAdvancedRule}
            formatFilter={formatFilter}
            setFormatFilter={setFormatFilter}
            isMobile={false}
          />
        </div>

        <div className="sm:hidden shrink-0">
          <FilterPresets
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            advancedRule={advancedRule}
            setAdvancedRule={setAdvancedRule}
            formatFilter={formatFilter}
            setFormatFilter={setFormatFilter}
            isMobile={true}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 sm:px-6 pb-3 overflow-x-auto no-scrollbar">
        <div className="sm:hidden relative shrink-0">
          <button
            onClick={onOpenCollections}
            className="bg-zinc-800/80 border border-zinc-700/50 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-300 focus:outline-none flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span>Collections</span>
            <svg className="w-2.5 h-2.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-1 sm:hidden shrink-0" />

        {QUICK_CHIPS.map(chip => {
          const isActive = searchQuery.toLowerCase().includes(chip);
          return (
            <button
              key={chip}
              onClick={() => handleChipToggle(chip)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap active:scale-95 ${
                isActive 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-zinc-800/40 border-zinc-700/30 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="absolute top-[100px] left-4 right-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[70] overflow-hidden backdrop-blur-2xl"
          >
            <div className="px-4 py-2 border-b border-zinc-800/50 bg-zinc-950/30">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Suggestions</span>
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              {suggestions.map((s, i) => {
                const isPerson = s.startsWith('person:');
                const displayName = isPerson ? s.replace('person:', '') : s;
                
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!searchQuery.trim()) {
                        setSearchQuery(s);
                        addToHistory(s);
                      } else {
                        const words = searchQuery.split(/\s+/);
                        words[words.length - 1] = s;
                        const newQuery = words.join(' ') + ' ';
                        setSearchQuery(newQuery);
                        addToHistory(newQuery);
                      }
                      setShowSuggestions(false);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-5 py-3.5 text-sm font-bold text-zinc-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-4 border-b border-zinc-800/50 last:border-0 group"
                  >
                    <div className={`w-8 h-8 rounded-lg ${isPerson ? 'bg-emerald-500/20' : 'bg-zinc-800'} flex items-center justify-center group-hover:bg-white/20 transition-colors`}>
                      {isPerson ? <User size={14} className="text-emerald-400 group-hover:text-white" /> : <Search size={14} className="text-zinc-500 group-hover:text-white" />}
                    </div>
                    {displayName}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {parsedRule && (
        <div className="px-4 sm:px-6 pb-3">
          <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 inline-flex items-center gap-2 shadow-sm">
            <span className="opacity-40">Active Filter:</span>
            <div className="flex items-center gap-1.5 text-white">
              {renderRulePreview(parsedRule)}
            </div>
            <button 
              onClick={() => {
                setSearchQuery('');
                setAdvancedRule(null);
              }}
              className="ml-1 p-0.5 hover:bg-indigo-500/20 rounded-md transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-zinc-800 bg-zinc-900/80"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Color</label>
                <select 
                  value={advColor}
                  onChange={(e) => setAdvColor(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any Color</option>
                  <option value="red">Red</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rating</label>
                <select 
                  value={advRating}
                  onChange={(e) => setAdvRating(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any Rating</option>
                  <option value="5 star">5 Stars</option>
                  <option value="4+ star">4+ Stars</option>
                  <option value="3+ star">3+ Stars</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</label>
                <select 
                  value={advDate}
                  onChange={(e) => setAdvDate(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="recent">Last 7 Days</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</label>
                <select 
                  value={advType}
                  onChange={(e) => setAdvType(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any Type</option>
                  <option value="portrait">Portrait</option>
                  <option value="duplicates">Duplicates</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
