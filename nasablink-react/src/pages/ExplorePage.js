import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { treeAPI } from '../services/api';
import { Search, TreePine, Users, Globe, ArrowRight, Loader2, MapPin, Star, Filter } from 'lucide-react';

const DEBOUNCE_MS = 400;

const REGIONS = [
  'All Regions',
  'Middle East',
  'North Africa',
  'South Asia',
  'Southeast Asia',
  'East Africa',
  'West Africa',
  'Central Asia',
  'Europe',
  'North America',
  'South America',
  'East Asia',
  'Oceania',
];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All Regions');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const inputRef = useRef(null);

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // Load featured trees on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await treeAPI.getFeaturedTrees();
        if (active) setFeatured(Array.isArray(res?.data) ? res.data : []);
      } catch {
        try {
          const res = await treeAPI.searchPublicTrees({ visibility: 'PUBLIC', page: 0, size: 12 });
          if (active) setFeatured(Array.isArray(res?.data?.content) ? res.data.content : Array.isArray(res?.data) ? res.data : []);
        } catch { /* silent */ }
      } finally {
        if (active) setFeaturedLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Search effect
  useEffect(() => {
    if (!debouncedQuery.trim() && region === 'All Regions') {
      setResults([]);
      setSearched(false);
      setPage(0);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const params = { page: 0, size: 20 };
        if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
        if (region !== 'All Regions') params.region = region;
        const res = await treeAPI.searchPublicTrees(params);
        if (active) {
          const content = Array.isArray(res?.data?.content) ? res.data.content : Array.isArray(res?.data) ? res.data : [];
          setResults(content);
          setSearched(true);
          setPage(0);
          setHasMore(res?.data?.totalPages > 1 || content.length >= 20);
        }
      } catch {
        if (active) { setResults([]); setSearched(true); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [debouncedQuery, region]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const params = { page: nextPage, size: 20 };
      if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
      if (region !== 'All Regions') params.region = region;
      const res = await treeAPI.searchPublicTrees(params);
      const content = Array.isArray(res?.data?.content) ? res.data.content : Array.isArray(res?.data) ? res.data : [];
      setResults(prev => [...prev, ...content]);
      setPage(nextPage);
      setHasMore(content.length >= 20);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const trees = searched ? results : featured;
  const showEmpty = (searched && results.length === 0 && !loading) || (!searched && !featuredLoading && featured.length === 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pt-20 pb-16">
      <div className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-5 xl:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-medium mb-3">
            <Globe className="w-3.5 h-3.5" />
            Community Discovery
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Explore Public Trees
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Discover family trees shared by the community. Connect ancestors across lineages and uncover hidden ties.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="max-w-2xl mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by family name, region, or keyword…"
              className="w-full h-12 ps-12 pe-24 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 dark:focus:border-primary-600 transition-all text-sm"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showFilters || region !== 'All Regions'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {region !== 'All Regions' && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
            </button>
            {loading && <Loader2 className="absolute end-20 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500 animate-spin" />}
          </div>

          {showFilters && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Region</label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      region === r
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section label */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
            {searched ? (
              `${results.length} result${results.length !== 1 ? 's' : ''} found`
            ) : (
              <><Star className="w-3.5 h-3.5" /> Featured Trees</>
            )}
          </h2>
          {region !== 'All Regions' && (
            <button onClick={() => setRegion('All Regions')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Clear filter ×
            </button>
          )}
        </div>

        {/* Grid */}
        {featuredLoading && !searched ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 animate-pulse">
                <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Globe className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {searched ? 'No trees found' : 'No public trees yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searched ? 'Try a different search term or clear filters.' : 'Be the first to share your family tree with the community.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {trees.map((tree) => (
                <button
                  key={tree.id || tree.familyTreeId}
                  onClick={() => navigate(`/explore/${tree.id || tree.familyTreeId}`)}
                  className="text-start rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 transition-all duration-200 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-lg hover:-translate-y-0.5 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center">
                        <TreePine className="h-4.5 w-4.5 text-primary-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                        {tree.name || tree.treeName}
                      </h3>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors mt-1" />
                  </div>
                  {tree.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{tree.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    {tree.memberCount != null && (
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{tree.memberCount} members</span>
                    )}
                    {tree.region && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tree.region}</span>
                    )}
                    <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Public</span>
                  </div>
                </button>
              ))}
            </div>

            {searched && hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
