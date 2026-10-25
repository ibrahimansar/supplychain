import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlignLeft,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Users,
  Shield,
  ChevronRight,
  Lock,
  Pencil,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input, Select, Switch } from '../components/ui/Input';
import CustomFieldsSection from '../components/CustomFieldsSection';
import { treeAPI } from '../services/api';
import useTreeFields, { buildCustomFieldState } from '../hooks/useTreeFields';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short text', Icon: Type, hint: 'A single line — a name, a place, a reference' },
  { value: 'TEXTAREA', label: 'Long text', Icon: AlignLeft, hint: 'Several lines — a story, a source note' },
  { value: 'NUMBER', label: 'Number', Icon: Hash, hint: 'A count or measure' },
  { value: 'DATE', label: 'Date', Icon: Calendar, hint: 'A calendar date' },
  { value: 'SELECT', label: 'Dropdown', Icon: List, hint: 'One of a fixed set of choices' },
  { value: 'CHECKBOX', label: 'Yes / No', Icon: CheckSquare, hint: 'A single toggle' },
];

const typeMeta = (value) => FIELD_TYPES.find((t) => t.value === value) || FIELD_TYPES[0];

/**
 * The fields every person form already has, in the order they appear on it.
 *
 * These are columns on the person record, not configurable definitions, so they
 * are listed read-only — an admin needs to see the whole form to judge what is
 * worth adding, and without them this tab showed custom fields floating in a
 * vacuum. `note` records what makes a field conditional, since several depend on
 * the tree's template or layout rather than always being present.
 */
const BUILT_IN_FIELDS = [
  { label: 'Name', type: 'Short text', required: true },
  { label: 'Second-script name', type: 'Short text', note: 'Trees with cultural names' },
  { label: 'Gender', type: 'Dropdown', required: true, note: 'Trees with gender enabled' },
  { label: 'Title', type: 'Short text' },
  { label: 'Birth year', type: 'Date' },
  { label: 'Death year', type: 'Date', note: 'Once marked deceased' },
  { label: 'Living or deceased', type: 'Choice' },
  { label: 'Description', type: 'Long text' },
  { label: 'Notes', type: 'Long text' },
  { label: 'Place of origin', type: 'Short text' },
  { label: 'Relationship to parent', type: 'Dropdown' },
  { label: 'No heir', type: 'Yes / No', note: 'Trees with no-heir enabled' },
  { label: 'Children arrangement', type: 'Dropdown', note: 'Dynamic layout only' },
];

/**
 * The toggles this tab renders. Keys must match TreeSettingsService, which
 * rejects anything it does not declare — so a typo here fails loudly rather
 * than silently saving nothing.
 */
/**
 * Settings grouped by what they actually affect.
 *
 * They were a flat list, which put "allow more than one spouse" — a change to
 * how relationships are recorded — at the same weight as a privacy toggle.
 * Keys must match TreeSettingsService, which rejects anything it does not
 * declare, so a typo here fails loudly rather than silently saving nothing.
 */
const SETTING_GROUPS = [
  {
    id: 'relationships',
    title: 'Relationships',
    blurb: 'How this tree records who is connected to whom.',
    Icon: Users,
    settings: [
      {
        key: 'allowMultipleSpouses',
        label: 'Allow more than one spouse',
        hint: 'A person can be married to several people. Their children can then record which couple they belong to.',
      },
    ],
  },
  {
    id: 'names',
    title: 'Names',
    blurb: 'What a person\u2019s name is made of in this tree.',
    Icon: Type,
    settings: [
      {
        key: 'showNameParts',
        label: 'Record structured name parts',
        hint: 'Adds honorific, epithet, ancestor chain and family name to the person form.',
      },
      {
        key: 'secondScriptLabel',
        type: 'text',
        label: 'Second-script name label',
        hint: 'What this tree calls its second name field. Also used when exporting to GEDCOM.',
        placeholder: 'Second-script name',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    blurb: 'What leaves this tree when you share it.',
    Icon: Shield,
    settings: [
      {
        key: 'publicShowCustomFields',
        label: 'Show your own fields on shared links',
        hint: 'When off, the fields you added stay private and are hidden from public and viewer links.',
      },
    ],
  },
];

const Tag = ({ tone, children }) => (
  <span
    className={`flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
      tone === 'required'
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300'
        : tone === 'custom'
          ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-300'
          : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400'
    }`}
  >
    {children}
  </span>
);

const emptyDraft = () => ({
  label: '',
  helpText: '',
  fieldType: 'TEXT',
  options: [''],
  required: false,
});

/**
 * The person form, as an admin shapes it.
 *
 * NasabLink ships one person form; every tree records something it does not
 * cover. Rather than guessing a universal schema, admins add the fields their
 * own records need, and the Add/Edit person modals render whatever is here.
 */
const CustomisationTab = ({ treeId, showToast }) => {
  const [settings, setSettings] = useState(null);
  const [savingSetting, setSavingSetting] = useState(null);
  const { fields, loading, reload, setFields } = useTreeFields(treeId, { includeDisabled: true });
  const [draft, setDraft] = useState(null);           // new field being composed
  const [editingId, setEditingId] = useState(null);   // existing field being edited
  const [editDraft, setEditDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [previewValues, setPreviewValues] = useState({});
  // The form is what people come here to change; behaviour is set once.
  const [view, setView] = useState('form');
  const [showBuiltIn, setShowBuiltIn] = useState(false);

  const enabledFields = useMemo(() => fields.filter((f) => f.enabled), [fields]);

  useEffect(() => {
    setPreviewValues(buildCustomFieldState(enabledFields));
  }, [enabledFields]);

  // TreeAdminPage's toast takes (message, type) — keep that order.
  useEffect(() => {
    let active = true;
    treeAPI.getTreeCustomisation(treeId)
      .then((res) => { if (active) setSettings(res?.data || {}); })
      .catch(() => { if (active) setSettings({}); });
    return () => { active = false; };
  }, [treeId]);

  const notify = useCallback((type, message) => {
    if (showToast) showToast(message, type);
    else if (type === 'error') setError(message);
  }, [showToast]);

  const setSetting = async (key, value) => {
    const previous = settings?.[key];
    // Optimistic: a switch that lags behind the click feels broken.
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavingSetting(key);
    try {
      const res = await treeAPI.updateTreeCustomisation(treeId, { [key]: value });
      setSettings(res?.data || {});
    } catch (e) {
      setSettings((prev) => ({ ...prev, [key]: previous }));
      notify('error', serverMessage(e, 'Could not change that setting.'));
    } finally {
      setSavingSetting(null);
    }
  };

  const serverMessage = (e, fallback) =>
    e?.response?.data?.message || e?.response?.data?.error || fallback;

  // ------------------------------------------------------------- create

  const submitDraft = async () => {
    if (!draft?.label?.trim()) {
      setError('Give the field a label.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await treeAPI.createTreeField(treeId, {
        label: draft.label.trim(),
        helpText: draft.helpText?.trim() || null,
        fieldType: draft.fieldType,
        options: draft.fieldType === 'SELECT'
          ? draft.options.map((o) => o.trim()).filter(Boolean)
          : null,
        required: !!draft.required,
      });
      await reload({ forceRefresh: true });
      setDraft(null);
      notify('success', 'Field added to the person form');
    } catch (e) {
      setError(serverMessage(e, 'Could not add the field.'));
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------- update

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditDraft({
      label: f.label,
      helpText: f.helpText || '',
      fieldType: f.fieldType,
      options: f.options?.length ? [...f.options] : [''],
      required: f.required,
    });
    setError('');
  };

  const submitEdit = async (f) => {
    if (!editDraft?.label?.trim()) {
      setError('Give the field a label.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await treeAPI.updateTreeField(treeId, f.id, {
        label: editDraft.label.trim(),
        helpText: editDraft.helpText?.trim() || null,
        fieldType: editDraft.fieldType,
        options: editDraft.fieldType === 'SELECT'
          ? editDraft.options.map((o) => o.trim()).filter(Boolean)
          : null,
        required: !!editDraft.required,
      });
      await reload({ forceRefresh: true });
      setEditingId(null);
      setEditDraft(null);
      notify('success', 'Field updated');
    } catch (e) {
      setError(serverMessage(e, 'Could not update the field.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (f) => {
    // Optimistic: the switch should not lag behind the click.
    setFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, enabled: !x.enabled } : x)));
    try {
      await treeAPI.updateTreeField(treeId, f.id, { enabled: !f.enabled });
      await reload({ forceRefresh: true });
    } catch (e) {
      setFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, enabled: f.enabled } : x)));
      notify('error', serverMessage(e, 'Could not change the field.'));
    }
  };

  const move = async (index, delta) => {
    const next = [...fields];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
    try {
      await treeAPI.reorderTreeFields(treeId, next.map((f) => f.id));
    } catch (e) {
      await reload({ forceRefresh: true });
      notify('error', serverMessage(e, 'Could not save the new order.'));
    }
  };

  const doDelete = async () => {
    const f = confirmDelete;
    setConfirmDelete(null);
    if (!f) return;
    try {
      await treeAPI.deleteTreeField(treeId, f.id);
      await reload({ forceRefresh: true });
      notify('success', `"${f.label}" removed from the form`);
    } catch (e) {
      notify('error', serverMessage(e, 'Could not remove the field.'));
    }
  };

  // -------------------------------------------------------------- render

  const renderDraftEditor = (value, setValue, onSubmit, onCancel, submitLabel, existing) => {
    const isSelect = value.fieldType === 'SELECT';
    const lockedType = existing && existing.fieldType !== value.fieldType;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <Input
              value={value.label}
              autoFocus
              placeholder="e.g. House name, Migration year, Burial place"
              onChange={(e) => setValue({ ...value, label: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">What people will see above the input.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Type</label>
            <Select
              value={value.fieldType}
              onChange={(e) => setValue({ ...value, fieldType: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{typeMeta(value.fieldType).hint}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Hint (optional)</label>
          <Input
            value={value.helpText}
            placeholder="A short note shown under the input"
            onChange={(e) => setValue({ ...value, helpText: e.target.value })}
          />
        </div>

        {isSelect && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Choices</label>
            <div className="space-y-2">
              {value.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    placeholder={`Choice ${i + 1}`}
                    onChange={(e) => {
                      const next = [...value.options];
                      next[i] = e.target.value;
                      setValue({ ...value, options: next });
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Remove choice ${i + 1}`}
                    onClick={() => setValue({
                      ...value,
                      options: value.options.filter((_, j) => j !== i),
                    })}
                    className="p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setValue({ ...value, options: [...value.options, ''] })}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300"
            >
              <Plus className="h-3.5 w-3.5" /> Add choice
            </button>
          </div>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <Switch
            checked={!!value.required}
            onChange={(v) => setValue({ ...value, required: v })}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-700 dark:text-gray-300">Required</span>
            <span className="block text-xs text-slate-500 dark:text-gray-400">
              Nobody can save a person until this field is filled in.
            </span>
          </span>
        </label>

        {lockedType && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            Changing the type is only possible while no person holds a value for this field.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} loading={saving} disabled={saving}>
            {submitLabel}
          </Button>
        </div>
      </div>
    );
  };

  if (loading && fields.length === 0) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-gray-700" />
        <div className="h-16 rounded-2xl bg-slate-100 dark:bg-gray-700" />
        <div className="h-16 rounded-2xl bg-slate-100 dark:bg-gray-700" />
      </div>
    );
  }

  const customCount = fields.length;

  return (
    <div className="space-y-5">
      {/* Two genuinely different jobs: deciding what the tree allows, and
          shaping the form. They were stacked as equal cards, so neither read as
          a place you go to do a thing. */}
      <div className="inline-flex rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-1">
        {[
          { id: 'form', label: 'Person form', count: customCount },
          { id: 'behaviour', label: 'Behaviour' },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              view === v.id
                ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {v.label}
            {v.count != null && v.count > 0 && (
              <span className="rounded-full bg-slate-200 dark:bg-gray-600 px-1.5 text-[11px] font-semibold text-slate-700 dark:text-gray-200">
                {v.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Behaviour ──────────────────────────────────────────────── */}
      {view === 'behaviour' && (
        <div className="space-y-4 max-w-3xl">
          {settings === null ? (
            <div aria-busy="true" className="space-y-3">
              <div className="h-24 rounded-2xl bg-slate-100 dark:bg-gray-700" />
              <div className="h-24 rounded-2xl bg-slate-100 dark:bg-gray-700" />
            </div>
          ) : (
            SETTING_GROUPS.map((group) => (
              <Card key={group.id} className="p-5 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700">
                    <group.Icon className="h-4 w-4 text-slate-500 dark:text-gray-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{group.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400">{group.blurb}</p>

                    <div className="mt-4 space-y-4">
                      {group.settings.map((opt) => (
                        opt.type === 'text' ? (
                          <div key={opt.key}>
                            <label
                              htmlFor={`setting-${opt.key}`}
                              className="block text-sm font-medium text-slate-800 dark:text-gray-200"
                            >
                              {opt.label}
                            </label>
                            <p className="mb-1.5 text-xs text-slate-500 dark:text-gray-400">{opt.hint}</p>
                            <Input
                              id={`setting-${opt.key}`}
                              value={settings[opt.key] ?? ''}
                              placeholder={opt.placeholder}
                              disabled={savingSetting === opt.key}
                              onChange={(e) => setSettings((prev) => ({ ...prev, [opt.key]: e.target.value }))}
                              onBlur={(e) => setSetting(opt.key, e.target.value)}
                            />
                          </div>
                        ) : (
                          <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                            <Switch
                              checked={settings[opt.key] === true}
                              disabled={savingSetting === opt.key}
                              onChange={(v) => setSetting(opt.key, v)}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                                {opt.label}
                              </span>
                              <span className="block text-xs text-slate-500 dark:text-gray-400">{opt.hint}</span>
                            </span>
                          </label>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Person form ────────────────────────────────────────────── */}
      {view === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-4">
            {/* Your fields lead. The previous table opened with thirteen
                read-only built-in rows, so the only editable thing on the
                screen sat below a wall of rows marked "—". */}
            <Card className="p-5 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your fields</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                    Added to every Add and Edit person form in this tree, in this order.
                  </p>
                </div>
                {!draft && (
                  <Button type="button" size="sm" onClick={() => { setDraft(emptyDraft()); setError(''); }}>
                    <Plus className="h-4 w-4" /> Add field
                  </Button>
                )}
              </div>

              {draft && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700">
                  {renderDraftEditor(
                    draft, setDraft, submitDraft,
                    () => { setDraft(null); setError(''); },
                    'Add field', null,
                  )}
                </div>
              )}

              {!draft && customCount === 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 dark:border-gray-600 p-6 text-center">
                  <p className="text-sm text-slate-600 dark:text-gray-400">
                    Nothing added yet. The form still collects the built-in details below.
                  </p>
                  <Button type="button" size="sm" className="mt-3" onClick={() => setDraft(emptyDraft())}>
                    <Plus className="h-4 w-4" /> Add your first field
                  </Button>
                </div>
              )}

              {customCount > 0 && (
                <ul className="mt-4 space-y-2">
                  {fields.map((f, i) => {
                    const { Icon } = typeMeta(f.fieldType);
                    const isEditing = editingId === f.id;

                    if (isEditing) {
                      return (
                        <li key={f.id} className="rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-900/40 p-4">
                          {renderDraftEditor(
                            editDraft, setEditDraft, () => submitEdit(f),
                            () => { setEditingId(null); setEditDraft(null); setError(''); },
                            'Save changes', f,
                          )}
                        </li>
                      );
                    }

                    return (
                      <li
                        key={f.id}
                        className={`group flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 px-3 py-2.5 ${
                          f.enabled ? 'bg-white dark:bg-gray-800' : 'bg-slate-50 dark:bg-gray-900/40 opacity-70'
                        }`}
                      >
                        <span className="flex flex-col">
                          <button
                            type="button" onClick={() => move(i, -1)} disabled={i === 0}
                            aria-label={`Move ${f.label} up`}
                            className="rounded text-slate-300 hover:text-slate-600 disabled:opacity-25 dark:text-gray-600 dark:hover:text-gray-300"
                          ><ChevronUp className="h-3.5 w-3.5" /></button>
                          <button
                            type="button" onClick={() => move(i, 1)} disabled={i === fields.length - 1}
                            aria-label={`Move ${f.label} down`}
                            className="rounded text-slate-300 hover:text-slate-600 disabled:opacity-25 dark:text-gray-600 dark:hover:text-gray-300"
                          ><ChevronDown className="h-3.5 w-3.5" /></button>
                        </span>

                        <Icon className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-gray-500" />

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{f.label}</span>
                            {f.required && <Tag tone="required">Required</Tag>}
                            {!f.enabled && <Tag>Hidden</Tag>}
                          </span>
                          <span className="block text-xs text-slate-400 dark:text-gray-500">
                            {typeMeta(f.fieldType).label}
                            {f.fieldType === 'SELECT' && f.options?.length ? ` · ${f.options.join(', ')}` : ''}
                            {f.helpText ? ` · ${f.helpText}` : ''}
                          </span>
                        </span>

                        {/* Actions stay quiet until the row is approached. */}
                        <span className="flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button" onClick={() => toggleEnabled(f)}
                            title={f.enabled ? 'Hide from the form' : 'Show on the form'}
                            aria-label={f.enabled ? `Hide ${f.label}` : `Show ${f.label}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          >{f.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                          <button
                            type="button" onClick={() => startEdit(f)} aria-label={`Edit ${f.label}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          ><Pencil className="h-4 w-4" /></button>
                          <button
                            type="button" onClick={() => setConfirmDelete(f)} aria-label={`Delete ${f.label}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          ><Trash2 className="h-4 w-4" /></button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Built-in fields are context, not work. Collapsed by default. */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowBuiltIn((v) => !v)}
                aria-expanded={showBuiltIn}
                className="flex w-full items-center gap-2.5 px-5 py-3.5 text-start"
              >
                <ChevronRight
                  className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${showBuiltIn ? 'rotate-90' : ''}`}
                />
                <Lock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                    {BUILT_IN_FIELDS.length} built-in fields
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-gray-400">
                    Always on the form. They cannot be removed or reordered.
                  </span>
                </span>
              </button>

              {showBuiltIn && (
                <ul className="border-t border-slate-100 dark:border-gray-700 px-5 py-3 space-y-2">
                  {BUILT_IN_FIELDS.map((f) => (
                    <li key={f.label} className="flex items-baseline justify-between gap-4">
                      <span className="min-w-0">
                        <span className="text-sm text-slate-700 dark:text-gray-300">{f.label}</span>
                        {f.required && <span className="ms-1.5 text-rose-500">*</span>}
                        {f.note && (
                          <span className="block text-xs text-slate-400 dark:text-gray-500">{f.note}</span>
                        )}
                      </span>
                      <span className="flex-shrink-0 text-xs text-slate-400 dark:text-gray-500">{f.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Preview sits beside the list it previews, not in a far column. */}
          <div className="lg:col-span-2">
            <Card className="p-5 lg:sticky lg:top-5 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Preview</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                What people see when adding or editing someone.
              </p>
              <div className="mt-4">
                {enabledFields.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 dark:border-gray-600 p-5 text-center text-sm text-slate-500 dark:text-gray-400">
                    Your fields will appear here.
                  </p>
                ) : (
                  <CustomFieldsSection
                    fields={enabledFields}
                    values={previewValues}
                    onChange={(k, v) => setPreviewValues((prev) => ({ ...prev, [k]: v }))}
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this field?"
        message={
          confirmDelete
            ? `"${confirmDelete.label}" will disappear from the person form. Values already recorded stay on the people who have them, but nothing will show them. To hide the field without that risk, use the eye icon instead.`
            : ''
        }
        confirmText="Delete field"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default CustomisationTab;
