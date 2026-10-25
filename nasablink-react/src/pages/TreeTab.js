import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/Loading';
import { treeAPI } from '../services/api';
import { validators } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import { Globe, Lock, Eye, CheckCircle, MapPin, Copy, Link2 } from 'lucide-react';
import GedcomImporter from '../components/GedcomImporter';
import { validationAPI } from '../services/api';
import { useDataStore } from '../contexts/DataStoreContext';

/** Group heading: one level of hierarchy above the individual settings. */
const SettingsGroupHeading = ({ title, subtitle, tone }) => (
  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
    <h2
      className={`text-lg font-semibold ${
        tone === 'danger' ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'
      }`}
    >
      {title}
    </h2>
    {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
  </div>
);

/**
 * One setting, with its own explanation.
 *
 * Previously each setting was an <h2> in a flat list, so copying the tree ID
 * looked exactly as consequential as deleting the tree.
 */
const SettingsCard = ({ title, description, children }) => (
  <div className="card w-full p-4 dark:bg-gray-800 dark:border-gray-700">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
    {description && (
      <p className="mt-0.5 mb-3 text-sm text-gray-600 dark:text-gray-400">{description}</p>
    )}
    {children}
  </div>
);

const TreeTab = ({ treeId, showToast }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invalidateTrees } = useDataStore();
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null, variant: 'danger' });
  const [isOwner, setIsOwner] = useState(false);
  const [canManageTree, setCanManageTree] = useState(false);
  const [showGedcomImporter, setShowGedcomImporter] = useState(false);
  const [copiedTreeId, setCopiedTreeId] = useState(false);
  const askConfirm = (title, message, onConfirm, variant='danger') => setConfirmState({ open: true, title, message, onConfirm, variant });
  const closeConfirm = () => setConfirmState(c => ({ ...c, open: false }));

  // Owner gets full settings; ADMIN (incl. free plan) can layout / export / import.
  useEffect(() => {
    if (!treeId || !user?.id) {
      setIsOwner(false);
      setCanManageTree(false);
      return;
    }
    treeAPI.getMembers(treeId).then(res => {
      const members = res.data || [];
      const me = members.find(m => m.userId === user.id);
      const owner = !!me?.isOwner;
      const admin = owner || me?.role === 'ADMIN';
      setIsOwner(owner);
      setCanManageTree(admin);
    }).catch(() => {
      setIsOwner(false);
      setCanManageTree(false);
    });
  }, [treeId, user?.id]);

  const deleteThisTree = () => {
    askConfirm(
      'Delete Family Tree',
      'This will permanently delete this tree and all its data. This action cannot be undone.',
      async () => {
        closeConfirm();
        try {
          await treeAPI.deleteTree(treeId);
          // Bust the trees list so /trees reflects the deletion immediately
          invalidateTrees();
          // Navigate BEFORE any further state updates so we never operate on
          // an unmounted component.  The /trees page will mount fresh.
          navigate('/trees', { replace: true });
        } catch (e) {
          showToast(e?.response?.data?.message || 'Failed to delete tree', 'error');
        }
      }
    );
  };

  const copyTreeId = async () => {
    try {
      await navigator.clipboard.writeText(String(treeId));
      setCopiedTreeId(true);
      showToast?.('Tree ID copied');
      setTimeout(() => setCopiedTreeId(false), 2000);
    } catch {
      showToast?.('Could not copy Tree ID', 'error');
    }
  };

  // Grouped rather than nine equally-weighted headings in a flat list. The old
  // order led with Tree ID — a value you copy once — and gave deleting the tree
  // the same prominence as everything else.
  const groups = [
    {
      id: 'tree',
      title: t('tree_settings.groups.tree', 'This tree'),
      subtitle: t('tree_settings.groups.tree_sub', 'How this tree is set up and drawn'),
      show: true,
    },
    {
      id: 'sharing',
      title: t('tree_settings.groups.sharing', 'Sharing'),
      subtitle: t('tree_settings.groups.sharing_sub', 'Who can find this tree and what they see'),
      show: isOwner,
    },
    {
      id: 'data',
      title: t('tree_settings.groups.data', 'Your data'),
      subtitle: t('tree_settings.groups.data_sub', 'Move it in or out, and check it over'),
      show: canManageTree,
    },
    {
      id: 'danger',
      title: t('tree_settings.groups.danger', 'Danger zone'),
      subtitle: t('tree_settings.groups.danger_sub', 'Irreversible, and only the owner can do it'),
      show: isOwner,
    },
  ].filter((g) => g.show);

  return (
    <section className="dark:text-white">
      {/* On a page this long, jumping beats scrolling. */}
      <nav aria-label={t('tree_settings.jump_to', 'Jump to section')} className="mb-5 flex flex-wrap gap-2">
        {groups.map((g) => (
          <a
            key={g.id}
            href={`#settings-${g.id}`}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              g.id === 'danger'
                ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {g.title}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {/* ── This tree ─────────────────────────────────────────────── */}
        <div id="settings-tree" className="scroll-mt-24 space-y-4">
          <SettingsGroupHeading
            title={t('tree_settings.groups.tree', 'This tree')}
            subtitle={t('tree_settings.groups.tree_sub', 'How this tree is set up and drawn')}
          />

          {/* "Name Languages" is what this actually controls. It was labelled
              "Node Settings", which told nobody anything. */}
          <SettingsCard
            title={t('tree_settings.name_languages', 'Name languages')}
            description={t('tree_settings.name_languages_desc', 'Which scripts a person&apos;s name can be recorded in.')}
          >
            <NodeSettings treeId={treeId} />
          </SettingsCard>

          {isOwner && (
            <SettingsCard
              title={t('tree_settings.tree_type', 'Tree type')}
              description={t('tree_settings.tree_type_desc', 'Simple keeps the essentials. Advanced unlocks documents and richer records.')}
            >
              <TreeTypeSettings treeId={treeId} showToast={showToast} />
            </SettingsCard>
          )}

          {canManageTree && (
            <SettingsCard
              title={t('tree_settings.layout', 'Layout')}
              description={t('tree_settings.layout_desc', 'How generations are arranged when the tree is drawn.')}
            >
              <TreeLayoutSettings treeId={treeId} showToast={showToast} />
            </SettingsCard>
          )}

          <SettingsCard
            title={t('tree_settings.tree_id', 'Tree ID')}
            description={t('tree_settings.tree_id_desc', 'Share this so another admin can link their tree to yours.')}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* ltr-force: an ID is not prose and must not mirror in RTL. */}
              <div className="ltr-force flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 font-mono text-sm text-gray-900 dark:text-white">
                <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate select-all" title={String(treeId)}>{treeId}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyTreeId}
                className="flex-shrink-0"
                title={t('tree_settings.copy_tree_id', 'Copy Tree ID')}
              >
                {copiedTreeId ? (
                  <>
                    <CheckCircle className="h-4 w-4 me-1.5 text-green-600" />
                    {t('common.copied', 'Copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 me-1.5" />
                    {t('tree_settings.copy_id', 'Copy ID')}
                  </>
                )}
              </Button>
            </div>
          </SettingsCard>
        </div>

        {/* ── Sharing ───────────────────────────────────────────────── */}
        {isOwner && (
          <div id="settings-sharing" className="scroll-mt-24 space-y-4">
            <SettingsGroupHeading
              title={t('tree_settings.groups.sharing', 'Sharing')}
              subtitle={t('tree_settings.groups.sharing_sub', 'Who can find this tree and what they see')}
            />
            <TreeVisibilitySettings treeId={treeId} showToast={showToast} />
          </div>
        )}

        {/* ── Your data ─────────────────────────────────────────────── */}
        {canManageTree && (
          <div id="settings-data" className="scroll-mt-24 space-y-4">
            <SettingsGroupHeading
              title={t('tree_settings.groups.data', 'Your data')}
              subtitle={t('tree_settings.groups.data_sub', 'Move it in or out, and check it over')}
            />

            {/* Import and export were two separate top-level sections. They are
                one concern — getting data in and out — so they sit together. */}
            <SettingsCard
              title={t('tree_settings.import_export', 'Import and export')}
              description={t('tree_settings.import_export_desc', 'Available on every plan. Export is never a paid feature.')}
            >
              <DataExportSection treeId={treeId} showToast={showToast} />
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('tree_settings.import_desc', 'Importing appends people to this tree, up to your plan\u2019s limit.')}
                </p>
                <Button variant="secondary" onClick={() => setShowGedcomImporter(true)}>
                  {t('tree_settings.import_gedcom', 'Import GEDCOM file')}
                </Button>
              </div>
            </SettingsCard>

            {showGedcomImporter && (
              <GedcomImporter
                treeId={treeId}
                onImportComplete={() => { showToast('GEDCOM imported successfully'); setShowGedcomImporter(false); }}
                onClose={() => setShowGedcomImporter(false)}
              />
            )}

            {isOwner && (
              <SettingsCard
                title={t('tree_settings.health', 'Health check')}
                description={t('tree_settings.health_desc', 'Finds gaps and inconsistencies worth a look.')}
              >
                <TreeHealthCheck treeId={treeId} showToast={showToast} />
              </SettingsCard>
            )}
          </div>
        )}

        {/* ── Danger zone ───────────────────────────────────────────────
            Rendered only for the owner. The heading used to render for
            everyone while its only contents were owner-gated, so every other
            member saw "Tree Management" with nothing beneath it. */}
        {isOwner && (
          <div id="settings-danger" className="scroll-mt-24 space-y-4">
            <SettingsGroupHeading
              title={t('tree_settings.groups.danger', 'Danger zone')}
              subtitle={t('tree_settings.groups.danger_sub', 'Irreversible, and only the owner can do it')}
              tone="danger"
            />
            <div className="card w-full p-4 border border-red-200 dark:bg-gray-800 dark:border-red-800">
              <h3 className="font-semibold mb-2 text-red-700 dark:text-red-400">
                {t('tree_settings.delete_tree', 'Delete this family tree')}
              </h3>
              <p className="text-sm text-gray-600 mb-3 dark:text-gray-400">
                {t('tree_settings.delete_tree_desc', 'Deletes the tree and everything in it. This cannot be undone, so export first if you want a copy.')}
              </p>
              <Button variant="danger" onClick={deleteThisTree}>
                {t('tree_settings.delete_tree_button', 'Delete this family tree')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} onCancel={closeConfirm} onConfirm={confirmState.onConfirm || closeConfirm} />
    </section>
  );
};

// Node settings component for language preferences
const NodeSettings = ({ treeId }) => {
  const languages = React.useMemo(() => ([
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
  ]), []);
  const [primary, setPrimary] = useState('en');
  const [secondary, setSecondary] = useState('ar');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`treeLang:${treeId}`);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.primary) setPrimary(cfg.primary);
        if (cfg.secondary) setSecondary(cfg.secondary);
      }
    } catch (_) {}
  }, [treeId]);

  const save = () => {
    // Validate languages
    const primaryError = validators.language(primary);
    const secondaryError = validators.language(secondary);

    if (primaryError || secondaryError) {
      // This shouldn't happen with the UI constraints, but just in case
      return;
    }

    try {
      localStorage.setItem(`treeLang:${treeId}`, JSON.stringify({ primary, secondary }));
      setSaved(true);
      setTimeout(()=>setSaved(false), 1200);
    } catch (_) {}
  };

  return (
    <div className="card w-full p-4 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="font-semibold mb-3 dark:text-white">Name Languages</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="form-label dark:text-gray-300">Primary language</label>
          <select className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={primary} onChange={(e)=>{ const v=e.target.value; setPrimary(v); if (v===secondary){ const next = languages.find(l=>l.value!==v)?.value || 'ar'; setSecondary(next);} }}>
            {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label dark:text-gray-300">Secondary language</label>
          <select className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={secondary} onChange={(e)=>setSecondary(e.target.value)}>
            {languages.filter(l=>l.value!==primary).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={save}>Save</Button>
        {saved && <span className="text-sm text-green-700 dark:text-green-400">Saved</span>}
      </div>
    </div>
  );
};

// ─── Tree Visibility Settings ───────────────────────────────────────────────
const REGIONS = [
  '', 'Middle East', 'North Africa', 'South Asia', 'Southeast Asia', 'East Africa',
  'West Africa', 'Central Asia', 'Europe', 'North America', 'South America', 'East Asia', 'Oceania', 'Other',
];

const VISIBILITY_OPTIONS = [
  { value: 'PRIVATE', label: 'Private', icon: Lock, description: 'Only members with roles can view this tree.' },
  { value: 'UNLISTED', label: 'Unlisted', icon: Eye, description: 'Anyone with the direct link can view, but not discoverable in search.' },
  { value: 'PUBLIC', label: 'Public', icon: Globe, description: 'Discoverable on the Explore page. Anyone can view your tree.' },
];

const LAYOUT_OPTIONS = [
  {
    value: 'VERTICAL',
    label: 'Vertical (Default)',
    icon: '⇔',
    description: 'Children sit next to each other in a row. Best for shallow, wide trees.',
  },
  {
    value: 'HORIZONTAL',
    label: 'Horizontal',
    icon: '⇕',
    description: 'Children stack top to bottom in an indented column. Best for long, narrow lineages.',
  },
  {
    value: 'ALTERNATING',
    label: 'Alternating',
    icon: '⇄',
    description: 'Odd generations sit in a row, even generations stack. Keeps deep, wide trees compact.',
  },
  {
    value: 'DYNAMIC',
    label: 'Dynamic (Per person)',
    icon: '⌥',
    description: 'Choose the arrangement for each parent individually, from their Edit person dialog.',
  },
];

const TreeVisibilitySettings = ({ treeId, showToast }) => {
  const [visibility, setVisibility] = useState('PRIVATE');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [copiedPubLink, setCopiedPubLink] = useState(false);
  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/explore/${treeId}/view` : '';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await treeAPI.getTreeInfo(treeId);
        if (!active) return;
        const d = res.data;
        setVisibility(d.visibility || 'PRIVATE');
        setDescription(d.description || '');
        setRegion(d.region || '');
      } catch {
        // keep defaults
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [treeId]);

  const descriptionError = visibility === 'PUBLIC' && description.trim().length > 0 && description.trim().length < 6
    ? 'Description must be at least 6 characters.'
    : null;
  const descriptionMissing = visibility === 'PUBLIC' && description.trim().length === 0;

  const handleSave = async () => {
    if (visibility === 'PUBLIC' && description.trim().length < 6) {
      showToast('A description of at least 6 characters is required for public trees.', 'error');
      return;
    }
    setSaving(true);
    try {
      await treeAPI.updateTreeSettings(treeId, { visibility, description, region: region || null });
      showToast('Settings saved');
      setDirty(false);
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card w-full p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded-xl" />
          <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="card w-full p-5 dark:bg-gray-800 dark:border-gray-700 space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Control who can discover and view your family tree. Public trees appear on the Explore page.
      </p>

      {/* Visibility Radio Group */}
      <div className="space-y-2">
        <label className="form-label dark:text-gray-300 text-sm font-medium">Visibility</label>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setVisibility(opt.value); setDirty(true); }}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  selected
                    ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-200 dark:ring-primary-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selected ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${selected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {opt.label}
                    </span>
                    {selected && <CheckCircle className="h-4 w-4 text-primary-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="form-label dark:text-gray-300 text-sm font-medium">
          Description{visibility === 'PUBLIC' && <span className="text-red-500 ms-0.5">*</span>} <span className="text-gray-400 font-normal">({description.length}/500)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value.slice(0, 500)); setDirty(true); }}
          placeholder="Briefly describe this family tree (shown on Explore page)…"
          rows="3"
          className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 mt-1 ${
            (descriptionError || descriptionMissing)
              ? 'border-red-300 dark:border-red-600 focus:border-red-400 dark:focus:border-red-500'
              : 'border-gray-200 dark:border-gray-600 focus:border-primary-400 dark:focus:border-primary-600'
          }`}
        />
        {descriptionMissing && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">A description is required to make this tree public.</p>
        )}
        {descriptionError && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">{descriptionError}</p>
        )}
      </div>

      {/* Permanent public link — shown only when visibility is PUBLIC */}
      {visibility === 'PUBLIC' && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1.5 flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> Permanent public link
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-green-700 dark:text-green-400 truncate flex-1 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded select-all">
              {publicLink}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(publicLink).catch(() => {});
                setCopiedPubLink(true);
                setTimeout(() => setCopiedPubLink(false), 2000);
              }}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-600 dark:text-green-400"
              title="Copy link"
            >
              {copiedPubLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            Anyone can view the tree at this link without logging in.
          </p>
        </div>
      )}

      {/* Region */}
      <div>
        <label className="form-label dark:text-gray-300 text-sm font-medium flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> Region
        </label>
        <select
          value={region}
          onChange={(e) => { setRegion(e.target.value); setDirty(true); }}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 dark:focus:border-primary-600 mt-1"
        >
          <option value="">No region specified</option>
          {REGIONS.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="solid"
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={saving || !dirty || (visibility === 'PUBLIC' && description.trim().length < 6)}
          className="rounded-xl"
        >
          Save Settings
        </Button>
        {!dirty && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
    </div>
  );
};

/** Tree layout — available on Free and Plus for tree admins/owners. */
const TreeLayoutSettings = ({ treeId, showToast }) => {
  const [layoutMode, setLayoutMode] = useState('VERTICAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await treeAPI.getTreeInfo(treeId);
        if (!active) return;
        setLayoutMode(res.data?.layoutMode || 'VERTICAL');
      } catch {
        // keep default
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [treeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await treeAPI.updateTreeSettings(treeId, { layoutMode });
      showToast('Layout saved — reload the tree to see changes');
      setDirty(false);
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to save layout', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card w-full p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="card w-full p-5 dark:bg-gray-800 dark:border-gray-700 space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        How children are arranged under each parent. Available on Free and Plus.
      </p>
      <div className="space-y-2">
        {LAYOUT_OPTIONS.map((opt) => {
          const selected = layoutMode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setLayoutMode(opt.value); setDirty(true); }}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                selected
                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
                selected ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${selected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {opt.label}
                  </span>
                  {selected && <CheckCircle className="h-4 w-4 text-primary-500" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Reload the tree page after saving for the new layout to apply.
      </p>
      <div className="flex items-center gap-3 pt-1">
        <Button variant="solid" size="sm" onClick={handleSave} loading={saving} disabled={saving || !dirty} className="rounded-xl">
          Save Layout
        </Button>
        {!dirty && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
    </div>
  );
};

// Tree type settings component
const TreeTypeSettings = ({ treeId, showToast }) => {
  const [treeInfo, setTreeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [demoting, setDemoting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: '', message: '' });

  const loadTreeInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await treeAPI.getTreeInfo(treeId);
      setTreeInfo(response.data);
    } catch (error) {
      console.error('Error loading tree info:', error);
      showToast('Failed to load tree information', 'error');
    } finally {
      setLoading(false);
    }
  }, [treeId, showToast]);

  useEffect(() => {
    loadTreeInfo();
  }, [loadTreeInfo]);

  const handlePromote = () => {
    setConfirmDialog({
      open: true,
      action: 'promote',
      title: 'Promote to Advanced Tree',
      message: 'Are you sure you want to promote this tree to Advanced? This will enable Documents and future advanced features.'
    });
  };

  const handleDemote = () => {
    setConfirmDialog({
      open: true,
      action: 'demote',
      title: 'Demote to Simple Tree',
      message: 'Are you sure you want to demote this tree to Simple? All documents will remain accessible, but new documents cannot be added until promoted again.'
    });
  };

  const executeAction = async () => {
    const { action } = confirmDialog;
    setConfirmDialog({ open: false, action: null, title: '', message: '' });

    try {
      if (action === 'promote') {
        setPromoting(true);
        await treeAPI.promoteTree(treeId);
        showToast('Tree promoted to Advanced successfully');
        await loadTreeInfo();
        window.dispatchEvent(new CustomEvent('treeTypeChanged', { detail: { treeId } }));
      } else if (action === 'demote') {
        setDemoting(true);
        await treeAPI.demoteTree(treeId);
        showToast('Tree demoted to Simple successfully');
        await loadTreeInfo();
        window.dispatchEvent(new CustomEvent('treeTypeChanged', { detail: { treeId } }));
      }
    } catch (error) {
      console.error(`Error ${action}ing tree:`, error);
      const errorMessage = error?.response?.data?.message || `Failed to ${action} tree`;
      showToast(errorMessage, 'error');
    } finally {
      setPromoting(false);
      setDemoting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  const isAdvanced = treeInfo?.treeType === 'ADVANCED';

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="space-y-6">
            {/* Tree Type Section */}
            <div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isAdvanced
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {isAdvanced ? 'Advanced' : 'Simple'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isAdvanced ? 'Includes Documents and advanced features' : 'Basic family tree features'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isAdvanced && (
                      <Button
                        onClick={handlePromote}
                        loading={promoting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Promote to Advanced
                      </Button>
                    )}
                    {isAdvanced && (
                      <Button
                        onClick={handleDemote}
                        loading={demoting}
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        Demote to Simple
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Features Comparison */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Feature Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Simple Tree</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Basic family tree structure</li>
                    <li>• Member management</li>
                    <li>• Tree connections</li>
                    <li>• Public sharing</li>
                  </ul>
                </div>
                <div className="border border-green-200 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Advanced Tree</h4>
                  <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                    <li>• All Simple features</li>
                    <li>• <strong>Documents</strong> - Upload and manage files</li>
                    <li>• Future advanced features</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}
        onConfirm={executeAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.action === 'promote' ? 'Promote' : 'Demote'}
        variant={confirmDialog.action === 'promote' ? 'primary' : 'warning'}
      />
    </>
  );
};

// Data Export component
const DataExportSection = ({ treeId, showToast }) => {
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingGedcom, setExportingGedcom] = useState(false);

  const handleExportJson = async () => {
    try {
      setExportingJson(true);
      const response = await treeAPI.exportTreeAsJson(treeId);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tree_${treeId}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('Tree exported successfully as JSON');
    } catch (error) {
      console.error('Error exporting tree as JSON:', error);
      showToast('Failed to export tree as JSON', 'error');
    } finally {
      setExportingJson(false);
    }
  };

  /**
   * Offloaded export: submit, poll, download.
   *
   * The request no longer holds a connection open while the server walks the
   * whole tree, so a large export can't hit the proxy's response timeout. The
   * trade-off is that the client is now responsible for giving up — hence the
   * attempt cap, so a stuck job surfaces as an error rather than a forever
   * spinner.
   */
  const handleExportGedcom = async () => {
    const POLL_INTERVAL_MS = 1000;
    const MAX_ATTEMPTS = 120; // ~2 minutes
    try {
      setExportingGedcom(true);
      const { data: job } = await treeAPI.submitExport(treeId, 'GEDCOM');

      let status = job.status;
      for (let attempt = 0; attempt < MAX_ATTEMPTS && status !== 'COMPLETED'; attempt++) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        const { data: poll } = await treeAPI.getExportStatus(treeId, job.jobId);
        status = poll.status;
        if (status === 'FAILED') throw new Error(poll.error || 'Export failed on the server');
      }
      if (status !== 'COMPLETED') throw new Error('Export is taking longer than expected. Please try again.');

      const response = await treeAPI.downloadExport(treeId, job.jobId);
      const blob = new Blob([response.data], { type: 'text/x-gedcom' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.filename || `tree_${treeId}_export_${new Date().toISOString().split('T')[0]}.ged`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Tree exported successfully as GEDCOM');
    } catch (error) {
      console.error('Error exporting tree as GEDCOM:', error);
      showToast(error.message || 'Failed to export tree as GEDCOM', 'error');
    } finally {
      setExportingGedcom(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Available on Free and Plus. Download your family tree as JSON or GEDCOM for backup or other genealogy software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* JSON Export */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">JSON Format</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Complete data export including all people, relationships, and metadata
                  </p>
                </div>
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <Button
                onClick={handleExportJson}
                loading={exportingJson}
                disabled={exportingGedcom}
                variant="secondary"
                className="w-full"
              >
                {exportingJson ? 'Exporting...' : 'Export as JSON'}
              </Button>
            </div>

            {/* GEDCOM Export */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">GEDCOM Format</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Standard genealogy format compatible with most family tree software
                  </p>
                </div>
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <Button
                onClick={handleExportGedcom}
                loading={exportingGedcom}
                disabled={exportingJson}
                variant="secondary"
                className="w-full"
              >
                {exportingGedcom ? 'Exporting...' : 'Export as GEDCOM'}
              </Button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-500 mt-0.5 me-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Export Tips:</p>
                <ul className="text-xs space-y-0.5">
                  <li>• Use <strong>JSON</strong> for backup or re-importing to NasabLink</li>
                  <li>• Use <strong>GEDCOM</strong> to import into other genealogy software like Ancestry, MyHeritage, etc.</li>
                  <li>• Export regularly to keep an offline backup of your data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};


const TreeHealthCheck = ({ treeId, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await validationAPI.validateTree(treeId);
      const issues = Array.isArray(res.data) ? res.data : (res.data?.issues || []);
      setResult({ issues, issueCount: issues.length });
    } catch (e) {
      showToast('Failed to run health check', 'error');
    }
    setLoading(false);
  };

  const CODE_LABELS = {
    MISSING_GENDER: 'Missing gender',
    MISSING_BIRTH_YEAR: 'Missing birth year',
    DEATH_BEFORE_BIRTH: 'Death before birth',
    BIRTH_IN_FUTURE: 'Future birth year',
    DEATH_IN_FUTURE: 'Future death year',
    IMPOSSIBLY_OLD: 'Implausible age',
    DECEASED_BUT_NO_DEATH_YEAR: 'Deceased without death year',
    LIVING_WITH_DEATH_YEAR: 'Living person has death year',
    PARENT_YOUNGER_THAN_CHILD: 'Parent younger than child',
    PARENT_TOO_YOUNG: 'Parent too young at birth',
    LARGE_AGE_GAP: 'Large parent-child age gap',
  };

  return (
    <Card>
      <div className="p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Scan your tree for data inconsistencies like impossible dates, implausible ages, and duplicate sibling names.
          </p>
          <Button onClick={handleCheck} loading={loading} variant="secondary">
            {loading ? 'Scanning...' : 'Run Health Check'}
          </Button>
        </div>

        {result && (
          <div>
            {result.issueCount === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">No issues found — your tree looks great!</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">{result.issueCount} issue{result.issueCount !== 1 ? 's' : ''} found</p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {result.issues.map((issue, i) => {
                    const isWarning = issue.severity === 'WARNING';
                    return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${isWarning ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                      <svg className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isWarning ? 'text-amber-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>
                          {CODE_LABELS[issue.code] || issue.code}
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{issue.personName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{issue.message}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TreeTab;
