/**
 * axios adapter that serves nasabLink's old REST calls from the CAP OData V4 service
 * (/odata/v4/nasablink). The UI code keeps calling api.get('/trees/1/members') etc.; this file maps each call to
 * $filter/$expand reads, PATCH updates or CAP actions and reshapes the result to what the UI expects.
 *
 * Endpoints that were not ported (documents, citations, share links, GDPR, admin console, ...) either answer with
 * an empty list (so tabs render empty) or fail with 501 "not available".
 */
import { AxiosError } from 'axios';
import { getAuthHeader } from './authStore';

export const SERVICE = process.env.REACT_APP_ODATA_URL || '/odata/v4/nasablink';

// ---------------------------------------------------------------- low-level OData
const httpError = (config, status, message, code) => {
  const response = { status, statusText: String(status), headers: {}, config, data: { error: code || String(status), message } };
  return new AxiosError(message, status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, null, response);
};

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

async function odata(config, method, path, { query, body } = {}) {
  const qs = query ? `?${Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
  const headers = { Accept: 'application/json' };
  const auth = getAuthHeader();
  if (auth) headers.Authorization = auth;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${SERVICE}${path}${qs}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    throw new AxiosError('Network Error', 'ERR_NETWORK', config);
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { /* not json */ }
  if (!res.ok) {
    const msg = json?.error?.message || res.statusText || 'Request failed';
    throw httpError(config, res.status, msg, json?.error?.code);
  }
  return json;
}

const get = (config, path, query) => odata(config, 'GET', path, { query });
const post = (config, path, body = {}) => odata(config, 'POST', path, { body });
const patch = (config, path, body) => odata(config, 'PATCH', path, { body });

async function getAll(config, path, query = {}) {
  const out = [];
  const size = 500;
  for (let skip = 0; ; skip += size) {
    const page = await get(config, path, { ...query, $top: size, $skip: skip });
    const rows = page?.value || [];
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

// ---------------------------------------------------------------- mapping helpers
const genderOut = (g) => (g === 'M' ? 'MALE' : g === 'F' ? 'FEMALE' : g || null);
const genderIn = (g) => (g == null ? g : String(g).trim().toUpperCase().startsWith('M') ? 'M' : 'F');
const parseJson = (s) => { try { return s ? JSON.parse(s) : {}; } catch (_) { return {}; } };

function personDto(p, extra = {}) {
  return {
    id: p.ID,
    name: p.name,
    arabicName: p.arabicName,
    title: p.title,
    description: p.description,
    birthYear: p.birthYear,
    deathYear: p.deathYear,
    gender: genderOut(p.gender),
    notes: p.notes,
    generation: p.generation,
    orderIndex: p.orderIndex,
    noHeir: p.noHeir ?? false,
    isLiving: p.isLiving,
    placeOfOrigin: p.placeOfOrigin,
    childLayout: p.childLayout,
    honorificName: p.honorificName,
    epithet: p.epithet,
    patronymic: p.patronymic,
    clanName: p.clanName,
    customFields: parseJson(p.customFields),
    publicCode: p.publicCode,
    treeId: p.tree_ID,
    ...extra,
  };
}

/** Loads one tree's people + relationships and builds the lookups the old TreeService used. */
async function loadGraph(config, treeId) {
  const [people, rels] = await Promise.all([
    getAll(config, '/People', { $filter: `tree_ID eq ${treeId}`, $orderby: 'orderIndex,name' }),
    getAll(config, '/Relationships', { $filter: `person1/tree_ID eq ${treeId}` }),
  ]);
  const byId = new Map(people.map((p) => [p.ID, p]));
  const children = new Map();
  const parentOf = new Map();
  const parentRelType = new Map();
  const coParent = new Map();
  const spouses = new Map();
  const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  rels.forEach((r) => {
    if (!byId.has(r.person1_ID) || !byId.has(r.person2_ID)) return;
    if (r.type === 'PARENT_CHILD') {
      add(children, r.person1_ID, r.person2_ID);
      parentOf.set(r.person2_ID, r.person1_ID);
      parentRelType.set(r.person2_ID, r.parentRelationshipType || 'BIOLOGICAL');
      if (r.coParent_ID) coParent.set(r.person2_ID, r.coParent_ID);
    } else {
      add(spouses, r.person1_ID, r.person2_ID);
      add(spouses, r.person2_ID, r.person1_ID);
    }
  });
  children.forEach((ids) => ids.sort((a, b) => (byId.get(a).orderIndex || 0) - (byId.get(b).orderIndex || 0)));
  const g = { people, byId, children, parentOf, parentRelType, coParent, spouses };
  g.dto = (id) => {
    const p = byId.get(id);
    if (!p) return null;
    const sp = (spouses.get(id) || []).map((s) => byId.get(s)).filter(Boolean);
    const cp = coParent.get(id) ? byId.get(coParent.get(id)) : null;
    return personDto(p, {
      spouseName: sp[0]?.name,
      spouseNames: sp.length ? sp.map((s) => s.name) : undefined,
      spouseIds: sp.length ? sp.map((s) => s.ID) : undefined,
      coParentName: cp?.name,
      coParentId: cp?.ID,
      parentRelationshipType: parentRelType.get(id),
    });
  };
  const size = (id, seen = new Set()) => {
    if (seen.has(id)) return 0;
    seen.add(id);
    return 1 + (children.get(id) || []).reduce((n, c) => n + size(c, seen), 0);
  };
  g.rootId = () => {
    const roots = people.filter((p) => !parentOf.has(p.ID));
    let best = null;
    let bestSize = -1;
    roots.forEach((p) => { const s = size(p.ID); if (s > bestSize) { best = p; bestSize = s; } });
    return (best || people[0])?.ID;
  };
  g.node = (id, visited = new Set()) => {
    if (visited.has(id)) return null;
    visited.add(id);
    const sp = (spouses.get(id) || [])[0];
    const node = { person: g.dto(id), children: [], spouse: sp ? g.dto(sp) : null };
    (children.get(id) || []).forEach((c) => { const n = g.node(c, visited); if (n) node.children.push(n); });
    return node;
  };
  return g;
}

async function roleOf(config, treeId) {
  const r = await get(config, '/Memberships', { $filter: `tree_ID eq ${treeId}`, $select: 'role' });
  return r.value[0]?.role || null;
}

const unsupported = (config, what) => httpError(config, 501, `${what} is not available in the SAP CAP port of NasabLink`, 'NOT_IMPLEMENTED');

// ---------------------------------------------------------------- routes
const CONST_TEMPLATES = {
  family: {
    id: 'family', name: 'Family / Nasab', description: 'Kinship trees with parents, children, spouses, and cultural naming.',
    available: true, defaultLayout: 'DEFAULT',
    labels: { workspace: 'Family tree', node: 'Person', addChild: 'Add descendant', addParent: 'Add parent', addSpouse: 'Add spouse',
      addMember: 'Add family member', editNode: 'Edit person', deleteNode: 'Delete person',
      emptyRootHint: 'Add the root ancestor to begin your family tree' },
    features: { spouses: true, gender: true, noHeir: true, gedcom: false, generationalLayout: true, culturalNames: true },
    nodeTypes: [], edgeTypes: [], actions: [],
  },
  org: {
    id: 'org', name: 'Org chart', description: 'Reporting hierarchy for teams and roles. Early platform template.',
    available: false, defaultLayout: 'DEFAULT',
    labels: { workspace: 'Org chart', node: 'Member', addChild: 'Add report', addParent: 'Add manager', addSpouse: '',
      addMember: 'Add team member', editNode: 'Edit member', deleteNode: 'Delete member',
      emptyRootHint: 'Add the top leader to begin your org chart' },
    features: { spouses: false, gender: false, noHeir: false, gedcom: false, generationalLayout: true, culturalNames: false },
    nodeTypes: [], edgeTypes: [], actions: [],
  },
};

const T = '/trees/([^/]+)';
const routes = [];
const on = (method, re, fn) => routes.push([method, new RegExp(`^${re}$`), fn]);

// --- me
const profile = (u) => ({
  id: u.id, uid: u.id, email: u.email, name: u.displayName, displayName: u.displayName,
  picture: u.photoUrl, photoURL: u.photoUrl, isAdmin: u.isAdmin,
  themePreference: u.themePreference, languagePreference: u.languagePreference,
});
export const fetchProfile = (config = {}) => get(config, '/me()').then(profile);
on('GET', '/me', (c) => fetchProfile(c));
on('GET', '/me/trees', async (c) => (await get(c, '/myTrees()')).value.map((t) => ({
  id: t.treeID, familyTreeId: t.treeID, treeName: t.treeName, name: t.treeName, role: t.role,
  treeType: t.treeType, templateId: t.templateId, isOwner: t.isOwner, visibility: t.visibility,
})));
on('GET', '/me/subscription', async () => ({ status: 'PLUS' }));
on('GET', '/me/entitlements', async () => ({
  plan: 'PLUS', isPlus: true, trees: { used: 0, limit: 1000, overLimit: false, canCreateMore: true },
  documentLimit: 0, canUploadDocuments: false, canCreateAdvancedTrees: true, canChangeTreeLayout: true,
  canExportTree: false, canImportGedcom: false, trialAvailable: false, trialUsed: true, onTrial: false,
}));
on('POST', '/me/trial', async (c) => { throw unsupported(c, 'Subscriptions'); });
on('GET', '/me/theme', async (c) => ({ theme: (await fetchProfile(c)).themePreference || 'light' }));
on('PUT', '/me/theme', async (c, m, { data }) => { await post(c, '/setTheme', { theme: data.theme }); return { theme: data.theme }; });
on('GET', '/me/language', async (c) => ({ language: (await fetchProfile(c)).languagePreference || 'en' }));
on('PUT', '/me/language', async (c, m, { data }) => { await post(c, '/setLanguage', { language: data.language }); return { language: data.language }; });

// --- templates / static config
on('GET', '/templates', async () => Object.values(CONST_TEMPLATES).map(({ id, name, description, available, defaultLayout }) => ({ id, name, description, available, defaultLayout })));
on('GET', '/templates/([^/]+)', async (c, m) => { if (!CONST_TEMPLATES[m[1]]) throw httpError(c, 404, 'Template not found'); return CONST_TEMPLATES[m[1]]; });

// --- trees
on('POST', '/trees', async (c, m, { data }) => {
  const t = await post(c, '/createTree', { name: data?.name, treeType: data?.treeType, templateId: data?.templateId });
  return { id: t.treeID, name: t.treeName, treeType: t.treeType, templateId: t.templateId };
});
const treeInfo = async (c, id) => {
  const [tree, role] = await Promise.all([get(c, `/FamilyTrees(${id})`), roleOf(c, id)]);
  if (!role) throw httpError(c, 403, 'You do not have permission to access this tree', 'FORBIDDEN');
  return {
    id: tree.ID, name: tree.name, role, treeType: tree.treeType, templateId: tree.templateId, visibility: tree.visibility,
    description: tree.description, region: tree.region, layoutMode: tree.layoutMode,
  };
};
on('GET', `${T}/info`, (c, m) => treeInfo(c, m[1]));
on('GET', T, async (c, m) => { const i = await treeInfo(c, m[1]); return { id: i.id, name: i.name, role: i.role }; });
on('PUT', T, async (c, m, { data }) => {
  const body = {};
  ['name', 'description', 'region', 'visibility'].forEach((k) => { if (k in data) body[k] = data[k]; });
  if ('layoutMode' in data) body.layoutMode = { DEFAULT: 'VERTICAL', ALTERNATE: 'ALTERNATING' }[data.layoutMode] || data.layoutMode || 'VERTICAL';
  await patch(c, `/FamilyTrees(${m[1]})`, body);
  const t = await get(c, `/FamilyTrees(${m[1]})`);
  return { updated: true, id: t.ID, name: t.name, visibility: t.visibility, description: t.description, region: t.region, layoutMode: t.layoutMode };
});
on('DELETE', T, async (c, m) => { await post(c, '/deleteTree', { treeID: m[1] }); return { deleted: true }; });
on('POST', `${T}/promote`, async (c, m) => { await post(c, '/setTreeType', { treeID: m[1], treeType: 'ADVANCED' }); return { promoted: true, treeType: 'ADVANCED' }; });
on('POST', `${T}/demote`, async (c, m) => { await post(c, '/setTreeType', { treeID: m[1], treeType: 'SIMPLE' }); return { demoted: true, treeType: 'SIMPLE' }; });
on('POST', `${T}/leave`, async (c, m) => { await post(c, '/leaveTree', { treeID: m[1] }); return { left: true }; });
on('GET', `${T}/settings`, async () => ({}));
on('GET', `${T}/fields`, async () => []);

// --- members
const memberDto = (x) => ({ userId: x.userID, email: x.email, displayName: x.displayName, role: x.role, isOwner: x.isOwner });
on('GET', `${T}/members`, async (c, m) => (await get(c, `/members(treeID=${m[1]})`)).value.map(memberDto));
on('POST', `${T}/members/invite`, async (c, m, { data }) => {
  const r = await post(c, '/inviteMember', { treeID: m[1], email: data.email, role: data.role });
  return { status: r.status, message: r.message, role: r.status === 'already_member' ? r.message : undefined };
});
on('POST', `${T}/members/([^/]+)/role`, async (c, m, { data }) => {
  const r = await post(c, '/changeRole', { treeID: m[1], userID: decodeURIComponent(m[2]), role: data.role });
  return { updated: true, role: r.message };
});
on('DELETE', `${T}/members/([^/]+)`, async (c, m) => { await post(c, '/removeMember', { treeID: m[1], userID: decodeURIComponent(m[2]) }); return { removed: true }; });
on('GET', `${T}/role-limits`, async (c, m) => {
  const s = await get(c, `/stats(treeID=${m[1]})`);
  return { admin: { limit: 1000, used: s.admins }, verifier: { limit: 1000, used: s.verifiers }, viewer: { limit: 1000, used: s.viewers } };
});
on('GET', `${T}/stats`, async (c, m) => {
  const [s, g] = await Promise.all([get(c, `/stats(treeID=${m[1]})`), loadGraph(c, m[1])]);
  const gens = {};
  g.people.forEach((p) => { if (p.generation != null) gens[p.generation] = (gens[p.generation] || 0) + 1; });
  const keys = Object.keys(gens).map(Number);
  return {
    treeId: m[1], totalPersons: s.totalPersons, totalGenerations: s.maxGeneration,
    minGeneration: keys.length ? Math.min(...keys) : null, maxGeneration: keys.length ? Math.max(...keys) : null,
    generationCounts: gens, genderCounts: { MALE: s.male, FEMALE: s.female },
    leafCount: s.leafCount, parentCount: s.parentCount, avgChildrenPerParent: s.avgChildrenPerParent,
    roleCounts: { ADMIN: s.admins, VERIFIER: s.verifiers, VIEWER: s.viewers },
  };
});

// --- tree content (people)
on('GET', `${T}/tree`, async (c, m) => {
  const [g, info] = await Promise.all([loadGraph(c, m[1]), treeInfo(c, m[1])]);
  if (!g.people.length) return { empty: true, treeId: m[1], message: 'Tree has no persons yet. Add your first family member to get started.' };
  const root = g.node(g.rootId());
  root.layoutMode = info.layoutMode;
  root.fields = [];
  return root;
});
on('GET', `${T}/root`, async (c, m) => {
  const g = await loadGraph(c, m[1]);
  if (!g.people.length) throw httpError(c, 404, 'Root not found');
  return g.dto(g.rootId());
});
on('GET', `${T}/children/([^/]+)`, async (c, m) => { const g = await loadGraph(c, m[1]); return (g.children.get(m[2]) || []).map(g.dto); });
on('GET', `${T}/person/([^/]+)`, async (c, m) => {
  const g = await loadGraph(c, m[1]);
  const d = g.dto(m[2]);
  if (!d) throw httpError(c, 404, 'Person not found');
  return d;
});
on('GET', `${T}/persons/by-code/([^/]+)`, async (c, m) => {
  const g = await loadGraph(c, m[1]);
  const p = g.people.find((x) => x.publicCode === m[2].toUpperCase());
  if (!p) throw httpError(c, 404, 'Person not found');
  return g.dto(p.ID);
});
on('GET', `${T}/search`, async (c, m, { params }) => {
  const term = (params.name || '').trim().toLowerCase();
  if (!term) return [];
  const g = await loadGraph(c, m[1]);
  return g.people.filter((p) => (p.name || '').toLowerCase().includes(term)).slice(0, 100).map((p) => {
    const parent = g.byId.get(g.parentOf.get(p.ID));
    const father = parent && parent.gender !== 'F' ? parent : null;
    const mother = parent && parent.gender === 'F' ? parent : null;
    return {
      id: p.ID, name: p.name, arabicName: p.arabicName, title: p.title, gender: genderOut(p.gender), generation: p.generation,
      fatherId: father?.ID || null, fatherName: father?.name || null, fatherGeneration: father?.generation ?? null,
      motherId: mother?.ID || null, motherName: mother?.name || null, hasSpouse: (g.spouses.get(p.ID) || []).length > 0,
    };
  });
});
on('GET', `${T}/search/linked`, async () => []);
on('GET', `${T}/validate`, async () => []);
on('GET', `${T}/duplicates`, async () => []);

const PERSON_FIELDS = ['name', 'arabicName', 'title', 'description', 'notes', 'birthYear', 'deathYear', 'generation', 'orderIndex',
  'noHeir', 'isLiving', 'placeOfOrigin', 'childLayout', 'honorificName', 'epithet', 'patronymic', 'clanName'];

on('POST', `${T}/person`, async (c, m, { data }) => {
  if (!data.name || !data.name.trim() || !data.gender) throw httpError(c, 400, 'Name and gender are required');
  const created = await post(c, '/addPerson', {
    treeID: m[1], name: data.name, gender: genderIn(data.gender), birthYear: data.birthYear, deathYear: data.deathYear,
    arabicName: data.arabicName, title: data.title, description: data.description, childLayout: data.childLayout,
    parentID: data.parentId, childID: data.childId, coParentID: data.coParentId, honorificName: data.honorificName,
    epithet: data.epithet, patronymic: data.patronymic, clanName: data.clanName,
    customFields: data.customFields ? JSON.stringify(data.customFields) : undefined,
  });
  const g = await loadGraph(c, m[1]);
  return { status: 201, data: g.dto(created.ID) || personDto(created) };
});
on('PUT', `${T}/person/([^/]+)`, async (c, m, { data }) => {
  const body = {};
  PERSON_FIELDS.forEach((k) => {
    if (data[k] === undefined || data[k] === null) return;
    body[k] = typeof data[k] === 'string' && !data[k].trim() ? null : data[k];
  });
  if (data.gender) body.gender = genderIn(data.gender);
  if (data.customFields) {
    const cur = parseJson((await get(c, `/People(${m[2]})`, { $select: 'customFields' })).customFields);
    body.customFields = JSON.stringify({ ...cur, ...data.customFields });
  }
  if (Object.keys(body).length) await patch(c, `/People(${m[2]})`, body);
  if (data.parentRelationshipType) await post(c, `/People(${m[2]})/NasabLinkService.setParentRelationshipType`, { type: data.parentRelationshipType });
  return (await loadGraph(c, m[1])).dto(m[2]);
});
on('DELETE', `${T}/person/([^/]+)`, async (c, m) => { await post(c, `/People(${m[2]})/NasabLinkService.deletePerson`); return { deleted: true }; });
on('POST', `${T}/person/([^/]+)/spouse`, async (c, m, { data }) => {
  if (!data?.spouseId) throw httpError(c, 400, 'spouseId is required');
  if (data.spouseTreeId && data.spouseTreeId !== m[1]) throw unsupported(c, 'Linking spouses across trees');
  await post(c, `/People(${m[2]})/NasabLinkService.addSpouse`, { spouseID: data.spouseId });
  return (await loadGraph(c, m[1])).dto(data.spouseId);
});
on('DELETE', `${T}/person/([^/]+)/spouse`, async (c, m) => { await post(c, `/People(${m[2]})/NasabLinkService.removeSpouse`); return { removed: true }; });
on('GET', `${T}/person/([^/]+)/spouse`, async (c, m) => {
  const g = await loadGraph(c, m[1]);
  const sp = (g.spouses.get(m[2]) || [])[0];
  return { spouse: sp ? g.dto(sp) : null };
});
on('POST', `${T}/person/([^/]+)/reorder`, async (c, m, { data }) => {
  await post(c, `/People(${m[2]})/NasabLinkService.reorder`, { newIndex: data.orderIndex });
  return { reordered: true };
});

// --- notifications
const notif = (n) => ({
  id: n.ID, type: n.type, title: n.title, message: n.message, link: n.link, read: !!n.read,
  createdAt: n.createdAt, treeId: n.tree_ID, treeName: n.tree?.name,
});
on('GET', '/notifications', async (c, m, { params }) => {
  const r = await get(c, '/Notifications', { $orderby: 'createdAt desc', $top: Math.min(Number(params.limit) || 20, 100), $expand: 'tree($select=name)' });
  return r.value.map(notif);
});
on('GET', '/notifications/unread-count', async (c) => {
  const r = await get(c, '/Notifications', { $filter: 'read eq false', $count: 'true', $top: 1 });
  return { count: r['@odata.count'] ?? 0 };
});
on('POST', '/notifications/read-all', async (c) => { await post(c, '/markAllNotificationsRead'); return { read: true }; });
on('POST', '/notifications/([^/]+)/read', async (c, m) => { await patch(c, `/Notifications(${m[1]})`, { read: true }); return { read: true }; });
on('DELETE', '/notifications/([^/]+)', async (c, m) => { await odata(c, 'DELETE', `/Notifications(${m[1]})`); return { deleted: true }; });
on('DELETE', '/notifications', async (c) => {
  const all = await getAll(c, '/Notifications', { $select: 'ID' });
  await Promise.all(all.map((n) => odata(c, 'DELETE', `/Notifications(${n.ID})`)));
  return { deleted: true, count: all.length };
});

// --- features that were not ported: render as empty instead of erroring on page load
const EMPTY_LISTS = [
  new RegExp(`^${T}/(documents|viewers|viewers/share-links|contributions/pending|contributions/links|tags)$`),
  new RegExp(`^${T}/persons/[^/]+/(tags|questions)$`),
  new RegExp(`^${T}/citations/.*$`),
  /^\/person-links\/.*$/, /^\/tree-connections\/.*$/, /^\/admin\/trees\/[^/]+\/(verifiers|viewer-links)$/,
];
const EMPTY_COUNTS = [new RegExp(`^${T}/contributions/pending/count$`)];

// ---------------------------------------------------------------- adapter entry
const stripQuery = (url) => {
  const u = new URL(url, 'http://x');
  return { path: u.pathname, params: Object.fromEntries(u.searchParams.entries()) };
};

export default async function odataAdapter(config) {
  const method = (config.method || 'get').toUpperCase();
  const { path, params: urlParams } = stripQuery(config.url);
  const params = { ...urlParams, ...(config.params || {}) };
  let data = config.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (_) { /* leave */ }
  }
  data = data || {};

  let result;
  const hit = routes.find(([mm, re]) => mm === method && re.test(path));
  if (hit) {
    result = await hit[2](config, path.match(hit[1]), { data, params });
  } else if (method === 'GET' && EMPTY_COUNTS.some((re) => re.test(path))) {
    result = { count: 0 };
  } else if (method === 'GET' && EMPTY_LISTS.some((re) => re.test(path))) {
    result = [];
  } else {
    throw unsupported(config, `${method} ${path}`);
  }
  const status = result && result.status === 201 && result.data ? 201 : 200;
  const body = status === 201 ? result.data : result;
  return { data: body, status, statusText: 'OK', headers: {}, config, request: {} };
}
