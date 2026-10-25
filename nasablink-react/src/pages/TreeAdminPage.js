import React, { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { LOCALE_META } from '../i18n/locales';
import Toast from '../components/ui/Toast';
import { Users as UsersIcon, LinkIcon, ChartBar, RefreshCw } from '../components/ui/Icons';
import { Globe, GitBranch, Waypoints, Settings, ChevronLeft, FormInput, Inbox } from 'lucide-react';
import Tooltip from '../components/ui/Tooltip';
import RolesTab from './RolesTab';
import LinksTab from './LinksTab';
import StatsTab from './StatsTab';
import TreeTab from './TreeTab';
import ConnectionsTab from './ConnectionsTab';
import PersonLinksTab from './PersonLinksTab';
import CustomisationTab from './CustomisationTab';
import ContributionsTab from './ContributionsTab';

const TAB_CONFIG = [
  {
    id: 'roles',
    labelKey: 'tree_admin.tabs.members',
    labelFallback: 'Members',
    Icon: UsersIcon,
    group: 'Team',
    descKey: 'tree_admin.tab_desc.members',
    descFallback: 'Manage member roles & permissions',
  },
  {
    id: 'connections',
    labelKey: 'tree_admin.tabs.connections',
    labelFallback: 'Connections',
    Icon: GitBranch,
    group: 'Access',
    descKey: 'tree_admin.tab_desc.connections',
    descFallback: 'Link trees you admin — or connect via spouse person IDs',
  },
  {
    id: 'person-links',
    labelKey: 'tree_admin.tabs.person_links',
    labelFallback: 'Person Links',
    Icon: Waypoints,
    group: 'Access',
    descKey: 'tree_admin.tab_desc.person_links',
    descFallback: 'Match individuals across linked trees',
  },
  {
    id: 'links',
    labelKey: 'tree_admin.tabs.viewer_access',
    labelFallback: 'Viewer Access',
    Icon: LinkIcon,
    group: 'Access',
    descKey: 'tree_admin.tab_desc.viewer_access',
    descFallback: 'Create and manage public read-only links',
  },
  {
    id: 'contributions',
    labelKey: 'tree_admin.tabs.contributions',
    labelFallback: 'Contributions',
    Icon: Inbox,
    group: 'Team',
    descKey: 'tree_admin.tab_desc.contributions',
    descFallback: 'Ask relatives what they know, and review what comes back',
  },
  {
    id: 'form',
    labelKey: 'tree_admin.tabs.customisation',
    labelFallback: 'Customisation',
    Icon: FormInput,
    group: 'Tree',
    descKey: 'tree_admin.tab_desc.customisation',
    descFallback: 'Shape this tree: what it allows, and what its person records hold',
  },
  {
    id: 'stats',
    labelKey: 'tree_admin.tabs.analytics',
    labelFallback: 'Analytics',
    Icon: ChartBar,
    group: 'Tree',
    descKey: 'tree_admin.tab_desc.analytics',
    descFallback: 'Statistics, charts, and tree insights',
  },
  {
    id: 'tree',
    labelKey: 'tree_admin.tabs.settings',
    labelFallback: 'Settings',
    Icon: Settings,
    group: 'Tree',
    descKey: 'tree_admin.tab_desc.settings',
    descFallback: 'Tree configuration, visibility, and export',
  },
];

const TreeAdminPage = () => {
  const { treeId } = useParams();
  const { t, locale, setLocale } = useI18n();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'roles';
  const setActiveTab = (tab) => setSearchParams({ tab }, { replace: true });

  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const activeTabConfig = TAB_CONFIG.find((tc) => tc.id === activeTab) ?? TAB_CONFIG[0];

  return (
    <div className="min-h-screen bg-slate-50 pt-14 sm:pt-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Sticky CRM toolbar */}
      <div className="sticky top-14 sm:top-16 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
        <div className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex items-center gap-3">
              <Link
                to={`/trees/${treeId}`}
                className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Back to tree"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-[15px] sm:text-base font-semibold tracking-tight text-slate-900 truncate">
                  {t('tree_admin.title', 'Tree Administration')}
                </h1>
                <p className="text-xs text-slate-500 truncate">{t(activeTabConfig.descKey, activeTabConfig.descFallback)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative hidden sm:block">
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  aria-label={t('languages.select_language', 'Select language')}
                  className="h-8 appearance-none bg-slate-50 border border-slate-200 rounded-lg ps-2.5 pe-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
                >
                  {/* Each language is listed in its own script. Someone looking
                      for theirs recognises it far faster than a translated
                      label they cannot read. */}
                  {LOCALE_META.map((l) => (
                    <option key={l.code} value={l.code}>{l.nativeName}</option>
                  ))}
                </select>
                <Globe className="absolute end-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>

              <Tooltip label={t('tree_admin.tooltips.refresh_tab', 'Refresh current tab')}>
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  aria-label="Refresh"
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Horizontal tabs */}
          <div
            className="flex items-center gap-1 overflow-x-auto scrollbar-hidden -mx-1 px-1 pb-2"
            role="tablist"
            aria-label="Admin sections"
          >
            {TAB_CONFIG.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <tab.Icon className={`h-3.5 w-3.5 ${active ? 'opacity-90' : 'opacity-60'}`} />
                  {t(tab.labelKey, tab.labelFallback)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-5 xl:px-6 py-5 sm:py-6">
        <main className="min-w-0">
          {activeTab === 'roles' && <RolesTab key={refreshKey} treeId={treeId} showToast={showToast} />}
          {activeTab === 'links' && <LinksTab key={refreshKey} treeId={treeId} showToast={showToast} />}
          {activeTab === 'connections' && (
            <ConnectionsTab key={refreshKey} treeId={treeId} showToast={showToast} />
          )}
          {activeTab === 'person-links' && (
            <PersonLinksTab key={refreshKey} treeId={treeId} showToast={showToast} />
          )}
          {activeTab === 'contributions' && <ContributionsTab key={refreshKey} treeId={treeId} showToast={showToast} />}
          {activeTab === 'form' && <CustomisationTab key={refreshKey} treeId={treeId} showToast={showToast} />}
          {activeTab === 'tree' && <TreeTab key={refreshKey} treeId={treeId} showToast={showToast} />}
          {activeTab === 'stats' && <StatsTab key={refreshKey} treeId={treeId} showToast={showToast} />}
        </main>
      </div>
    </div>
  );
};

export default TreeAdminPage;
