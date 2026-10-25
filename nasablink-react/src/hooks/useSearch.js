import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';

/**
 * useSearch Hook
 * 
 * Custom hook for advanced search functionality.
 * Provides debounced search, filter management, and result caching.
 */
export function useSearch(treeId, options = {}) {
  const { 
    debounceMs = 300,
    initialFilters = {},
    pageSize = 20,
    autoSearch = false,
  } = options;
  
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  
  const debounceRef = useRef(null);
  const cacheRef = useRef(new Map());
  
  // Generate cache key from search params
  const getCacheKey = useCallback((q, f, p) => {
    return JSON.stringify({ query: q, filters: f, page: p, treeId });
  }, [treeId]);
  
  // Perform search
  const search = useCallback(async (searchQuery, searchFilters, searchPage = 0) => {
    if (!treeId) return;
    
    const cacheKey = getCacheKey(searchQuery, searchFilters, searchPage);
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // Cache for 1 minute
        setResults(cached.data.results);
        setTotalCount(cached.data.totalCount);
        setTotalPages(cached.data.totalPages);
        setSuggestions(cached.data.suggestions || []);
        return cached.data;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('query', searchQuery);
      if (searchFilters.generation != null) params.append('generation', searchFilters.generation);
      if (searchFilters.relationship && searchFilters.relationship !== 'all') {
        params.append('relationship', searchFilters.relationship);
      }
      if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
      if (searchFilters.location) params.append('location', searchFilters.location);
      if (searchFilters.gender && searchFilters.gender !== 'all') {
        params.append('gender', searchFilters.gender);
      }
      if (searchFilters.alive && searchFilters.alive !== 'all') {
        params.append('alive', searchFilters.alive);
      }
      params.append('page', searchPage);
      params.append('size', pageSize);
      
      const response = await api.get(`/search/tree/${treeId}/advanced?${params.toString()}`);
      const data = response.data;
      
      // Cache the result
      cacheRef.current.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      // Limit cache size
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        cacheRef.current.delete(firstKey);
      }
      
      setResults(data.results || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 0);
      setSuggestions(data.suggestions || []);
      
      return data;
      
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed');
      setResults([]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [treeId, pageSize, getCacheKey]);
  
  // Debounced search
  const debouncedSearch = useCallback((searchQuery, searchFilters) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      search(searchQuery, searchFilters, 0);
      setPage(0);
    }, debounceMs);
  }, [search, debounceMs]);
  
  // Update query with debounced search
  const updateQuery = useCallback((newQuery) => {
    setQuery(newQuery);
    if (autoSearch || newQuery.length > 0) {
      debouncedSearch(newQuery, filters);
    }
  }, [filters, debouncedSearch, autoSearch]);
  
  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      debouncedSearch(query, updated);
      return updated;
    });
  }, [query, debouncedSearch]);
  
  // Clear filters
  const clearFilters = useCallback(() => {
    const emptyFilters = {
      generation: null,
      relationship: 'all',
      dateFrom: '',
      dateTo: '',
      location: '',
      gender: 'all',
      alive: 'all',
    };
    setFilters(emptyFilters);
    if (query || autoSearch) {
      debouncedSearch(query, emptyFilters);
    }
  }, [query, debouncedSearch, autoSearch]);
  
  // Load more / pagination
  const loadPage = useCallback((pageNum) => {
    setPage(pageNum);
    search(query, filters, pageNum);
  }, [query, filters, search]);
  
  // Immediate search (no debounce)
  const searchNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    search(query, filters, 0);
    setPage(0);
  }, [query, filters, search]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  
  // Auto search on mount if enabled
  useEffect(() => {
    if (autoSearch && treeId) {
      search('', filters, 0);
    }
  }, [treeId, autoSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    // State
    query,
    filters,
    results,
    isLoading,
    error,
    totalCount,
    page,
    totalPages,
    suggestions,
    
    // Actions
    setQuery: updateQuery,
    setFilters: updateFilters,
    clearFilters,
    search: searchNow,
    loadPage,
    
    // Utilities
    hasNextPage: page < totalPages - 1,
    hasPrevPage: page > 0,
    nextPage: () => loadPage(page + 1),
    prevPage: () => loadPage(page - 1),
  };
}

/**
 * useTimeline Hook
 * 
 * Hook for fetching family tree timeline data.
 */
export function useTimeline(treeId) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [yearRange, setYearRange] = useState({ start: null, end: null });
  
  const fetchTimeline = useCallback(async (startYear = null, endYear = null) => {
    if (!treeId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (startYear) params.append('startYear', startYear);
      if (endYear) params.append('endYear', endYear);
      
      const response = await api.get(`/search/tree/${treeId}/timeline?${params.toString()}`);
      setEvents(response.data || []);
      setYearRange({ start: startYear, end: endYear });
      
      return response.data;
      
    } catch (err) {
      console.error('Timeline error:', err);
      setError(err.message || 'Failed to load timeline');
      setEvents([]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [treeId]);
  
  // Initial load
  useEffect(() => {
    if (treeId) {
      fetchTimeline();
    }
  }, [treeId, fetchTimeline]);
  
  // Group events by year
  const eventsByYear = events.reduce((acc, event) => {
    const year = event.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});
  
  // Get year range
  const years = Object.keys(eventsByYear).map(Number).sort((a, b) => a - b);
  const minYear = years.length > 0 ? years[0] : null;
  const maxYear = years.length > 0 ? years[years.length - 1] : null;
  
  return {
    events,
    eventsByYear,
    isLoading,
    error,
    yearRange,
    minYear,
    maxYear,
    fetchTimeline,
    setYearRange: (start, end) => fetchTimeline(start, end),
  };
}

/**
 * useTreeStatistics Hook
 * 
 * Hook for fetching tree statistics.
 */
export function useTreeStatistics(treeId) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchStats = useCallback(async () => {
    if (!treeId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/search/tree/${treeId}/statistics`);
      setStats(response.data);
      return response.data;
      
    } catch (err) {
      console.error('Statistics error:', err);
      setError(err.message || 'Failed to load statistics');
      setStats(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [treeId]);
  
  // Initial load
  useEffect(() => {
    if (treeId) {
      fetchStats();
    }
  }, [treeId, fetchStats]);
  
  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}

export default useSearch;
