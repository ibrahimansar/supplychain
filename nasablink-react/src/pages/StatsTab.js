import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart, DonutChart, HorizontalBarChart } from '../components/ui/Charts';
import { StatsSkeleton } from '../components/ui/SkeletonLoader';
import { useLoadingPhase } from '../hooks/useDelayedLoading';
import { peekCachedData, treeAPI } from '../services/api';

const KPI = ({ label, value, accent = 'bg-teal-500' }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 ps-2">{label}</div>
    <div className="mt-1 ps-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
      {value}
    </div>
  </div>
);

const ChartCard = ({ title, subtitle, children, wide }) => (
  <div
    className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${
      wide ? 'lg:col-span-2' : ''
    }`}
  >
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const StatsTab = ({ treeId, showToast }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(() => peekCachedData(`admin:${treeId}:stats`) ?? null);
  const statsPhase = useLoadingPhase(loading && !stats);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await treeAPI.getStats(treeId);
      setStats(res.data || null);
    } catch (e) {
      if (e?.response?.status === 403) {
        navigate('/trees', { replace: true });
        return;
      }
      showToast('Failed to load stats', 'error');
    } finally {
      setLoading(false);
    }
  }, [treeId, navigate, showToast]);

  useEffect(() => {
    loadData();
  }, [treeId, loadData]);

  if (statsPhase !== 'content') {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Tree Statistics</h2>
        </div>
        <div className={statsPhase === 'hidden' ? 'invisible' : undefined} aria-busy="true">
          <StatsSkeleton cards={6} columns={3} />
        </div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Tree Statistics</h2>
        </div>
        <div className="p-4 text-slate-400">No stats available</div>
      </section>
    );
  }

  return (
    <section className={`space-y-6 animate-content-in ${loading ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Tree Statistics</h2>
          <p className="text-sm text-slate-400 mt-0.5">Overview of structure, members, and growth</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KPI label="Total Nodes" value={stats.totalPersons} accent="bg-teal-500" />
        <KPI label="Total Generations" value={stats.totalGenerations} accent="bg-indigo-500" />
        <KPI label="Max Depth" value={stats.maxDepth} accent="bg-violet-500" />
        <KPI label="Parents" value={stats.parentCount} accent="bg-sky-500" />
        <KPI label="Leaves" value={stats.leafCount} accent="bg-amber-500" />
        <KPI
          label="Avg Children / Parent"
          value={Number(stats.avgChildrenPerParent || 0).toFixed(2)}
          accent="bg-rose-400"
        />
      </div>

      {(stats?.generationCounts ||
        stats?.avgChildrenByGeneration ||
        stats?.topBranches ||
        stats?.genderCounts ||
        stats?.roleCounts) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats?.generationCounts && (
            <ChartCard title="Generations" subtitle="People per generation">
              <BarChart
                data={Object.entries(stats.generationCounts)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .slice(0, 8)
                  .map(([k, v]) => ({ key: k, label: `Gen ${k}`, value: v }))}
                height={220}
                color="#0d9488"
              />
            </ChartCard>
          )}
          {stats?.avgChildrenByGeneration && (
            <ChartCard title="Avg children" subtitle="Average children by generation">
              <BarChart
                data={Object.entries(stats.avgChildrenByGeneration)
                  .slice(0, 8)
                  .map(([k, v]) => ({ key: k, label: `Gen ${k}`, value: v }))}
                height={220}
                valueFormatter={(v) => Number(v).toFixed(2)}
                color="#6366f1"
              />
            </ChartCard>
          )}
          {stats?.genderCounts && (
            <ChartCard title="Gender split" subtitle="Composition of the tree">
              <DonutChart
                data={Object.entries(stats.genderCounts).map(([k, v]) => ({
                  label: k === 'MALE' ? 'Male' : k === 'FEMALE' ? 'Female' : k,
                  value: v,
                  color: k === 'MALE' ? '#7dd3fc' : k === 'FEMALE' ? '#c4b5fd' : '#f0abfc',
                }))}
                size={168}
                thickness={24}
                label="Total"
              />
            </ChartCard>
          )}
          {stats?.roleCounts && (
            <ChartCard title="Members by role" subtitle="Access roles on this tree">
              <HorizontalBarChart
                data={Object.entries(stats.roleCounts).map(([k, v]) => ({
                  key: k,
                  label: k,
                  value: v,
                  color: k === 'ADMIN' ? '#0ea5e9' : k === 'VERIFIER' ? '#14b8a6' : '#94a3b8',
                }))}
              />
            </ChartCard>
          )}
          {stats?.topBranches && stats.topBranches.length > 0 && (
            <ChartCard title="Top branches" subtitle="Largest subtrees by size" wide>
              <HorizontalBarChart
                data={stats.topBranches.slice(0, 10).map((b, i) => ({
                  key: b.anchorPersonId || i,
                  label: b.anchorName || `#${i + 1}`,
                  value: b.size,
                  color: '#f59e0b',
                }))}
              />
            </ChartCard>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Family Timeline</h3>
            <p className="text-sm text-slate-500 mt-1">
              Visualize lifespans of family members across generations
            </p>
          </div>
          <Link
            to={`/trees/${treeId}/timeline`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            View Timeline
          </Link>
        </div>
      </div>
    </section>
  );
};

export default StatsTab;
