import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, X, Calendar, MapPin, Users, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

/**
 * Advanced Search & Discovery Component
 * 
 * Features:
 * - Full-text search across names, notes, locations
 * - Filter by generation, relationship type, date range
 * - Location-based search
 * - Timeline view
 * - Recent searches
 * - Search suggestions
 */

// Search filter types
const FilterType = {
  GENERATION: 'generation',
  RELATIONSHIP: 'relationship',
  DATE_RANGE: 'dateRange',
  LOCATION: 'location',
  GENDER: 'gender',
  ALIVE: 'alive',
  HAS_DOCUMENTS: 'hasDocuments',
};

// Relationship types
const RelationshipTypes = [
  { value: 'all', label: 'All Relationships' },
  { value: 'parent', label: 'Parents' },
  { value: 'child', label: 'Children' },
  { value: 'spouse', label: 'Spouses' },
  { value: 'sibling', label: 'Siblings' },
];

/**
 * AdvancedSearch Component
 */
export function AdvancedSearch({
  onSearch,
  onResultClick,
  results = [],
  isLoading = false,
  placeholder = 'Search family members...',
  className = '',
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState({
    generation: null,
    relationship: 'all',
    dateFrom: '',
    dateTo: '',
    location: '',
    gender: 'all',
    alive: 'all',
    hasDocuments: 'all',
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  
  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nasablink_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);
  
  // Save recent searches
  const saveRecentSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
      try {
        localStorage.setItem('nasablink_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent searches:', e);
      }
      return updated;
    });
  }, []);
  
  // Handle search
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      saveRecentSearch(query);
    }
    onSearch?.(query, filters);
    setShowResults(true);
  }, [query, filters, onSearch, saveRecentSearch]);
  
  // Handle input change with debounce
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Show results panel
    if (value.length > 0) {
      setShowResults(true);
    }
  }, []);
  
  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  }, [handleSearch]);
  
  // Handle filter change
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      generation: null,
      relationship: 'all',
      dateFrom: '',
      dateTo: '',
      location: '',
      gender: 'all',
      alive: 'all',
      hasDocuments: 'all',
    });
  }, []);
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.generation !== null) count++;
    if (filters.relationship !== 'all') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.location) count++;
    if (filters.gender !== 'all') count++;
    if (filters.alive !== 'all') count++;
    if (filters.hasDocuments !== 'all') count++;
    return count;
  }, [filters]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle result click
  const handleResultClick = useCallback((result) => {
    onResultClick?.(result);
    setShowResults(false);
  }, [onResultClick]);
  
  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              onFocus={() => setShowResults(true)}
              placeholder={placeholder}
              className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-2 p-2.5 rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            aria-label="Toggle filters"
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs font-bold text-white bg-emerald-500 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="ms-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Filters</h4>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Generation Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Generation
              </label>
              <select
                value={filters.generation ?? ''}
                onChange={(e) => updateFilter('generation', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Generations</option>
                {[0, 1, 2, 3, 4, 5].map(gen => (
                  <option key={gen} value={gen}>Generation {gen}</option>
                ))}
              </select>
            </div>
            
            {/* Relationship Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Relationship
              </label>
              <select
                value={filters.relationship}
                onChange={(e) => updateFilter('relationship', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm"
              >
                {RelationshipTypes.map(rel => (
                  <option key={rel.value} value={rel.value}>{rel.label}</option>
                ))}
              </select>
            </div>
            
            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) => updateFilter('gender', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            
            {/* Living Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.alive}
                onChange={(e) => updateFilter('alive', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="living">Living</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>
            
            {/* Date Range - From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Born After
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm"
              />
            </div>
            
            {/* Date Range - To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Born Before
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm"
              />
            </div>
            
            {/* Location Filter */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                  placeholder="City, country, or region..."
                  className="w-full ps-10 pe-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                Recent Searches
              </h5>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search);
                      handleSearch();
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Search className="h-3 w-3 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Searching...</p>
            </div>
          )}
          
          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div className="overflow-y-auto max-h-72">
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {results.map((result, index) => (
                  <li key={result.id || index}>
                    <button
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-start"
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {result.name || `${result.firstName} ${result.lastName}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.birthDate && `Born ${result.birthDate}`}
                          {result.birthPlace && ` • ${result.birthPlace}`}
                        </p>
                      </div>
                      
                      {/* Generation badge */}
                      {result.generation !== undefined && (
                        <span className="flex-shrink-0 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Gen {result.generation}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* No Results */}
          {!isLoading && query && results.length === 0 && (
            <div className="p-8 text-center">
              <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SearchResults Component - Full page search results
 */
export function SearchResults({ results, isLoading, onResultClick }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No results found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Try different search terms or adjust your filters
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((result, index) => (
        <div
          key={result.id || index}
          onClick={() => onResultClick?.(result)}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {result.name || `${result.firstName} ${result.lastName}`}
              </h4>
              
              <div className="mt-1 space-y-1">
                {result.birthDate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {result.birthDate}
                    {result.deathDate && ` - ${result.deathDate}`}
                  </p>
                )}
                {result.birthPlace && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {result.birthPlace}
                  </p>
                )}
              </div>
              
              {result.generation !== undefined && (
                <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                  Generation {result.generation}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdvancedSearch;
