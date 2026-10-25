// Pure geometry for the family-tree layout, kept separate from the React Flow
// wiring so it can be unit-tested on its own.
// ── Layout geometry ─────────────────────────────────────────────────────────
export const NODE_SLOT = 280;   // horizontal footprint — room for ~240px card + gap (avoids collisions)
export const LEVEL_GAP = 270;   // parent row → children row, when children sit side by side
export const ROW_PITCH = 210;   // vertical pitch of one node row, when children are stacked
export const STACK_INDENT = 140; // how far a stacked child column sits right of its parent

/**
 * How a parent arranges its children.
 *   VERTICAL   — children side by side in a row (the tree grows downward)
 *   HORIZONTAL — children stacked in a column, indented (the tree grows sideways)
 *
 * ALTERNATING keys off generation number, so the root (level 0 = generation 1,
 * odd) spreads its children in a row and the next generation stacks them.
 * DYNAMIC reads each parent's own `childLayout`, defaulting to VERTICAL.
 */
export const resolveChildOrientation = (layoutMode, level, person) => {
  switch (layoutMode) {
    case 'HORIZONTAL':
      return 'HORIZONTAL';
    case 'ALTERNATING':
      return level % 2 === 0 ? 'VERTICAL' : 'HORIZONTAL';
    case 'DYNAMIC':
      return person?.childLayout === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL';
    default:
      return 'VERTICAL';
  }
};

// Sort children elder-first: explicit orderIndex, then birth year, then id.
export const sortChildren = (children) => [...children].filter(Boolean).sort((a, b) => {
  const personA = a.person || a;
  const personB = b.person || b;

  const orderA = personA.orderIndex != null ? personA.orderIndex : 0;
  const orderB = personB.orderIndex != null ? personB.orderIndex : 0;
  if (orderA !== orderB) return orderA - orderB;

  const hasBirthA = personA.birthYear !== null && personA.birthYear !== undefined;
  const hasBirthB = personB.birthYear !== null && personB.birthYear !== undefined;
  if (hasBirthA && hasBirthB) return personA.birthYear - personB.birthYear;
  if (hasBirthA) return -1;
  if (hasBirthB) return 1;

  return String(personA.id).localeCompare(String(personB.id));
});

/** Total descendants under a node (children + grandchildren + …). */
export const countDescendants = (node) => {
  const children = node?.children || [];
  let n = 0;
  for (const child of children) {
    n += 1 + countDescendants(child);
  }
  return n;
};

/** Deepest descendant distance from this node (0 = leaf). */
export const maxSubtreeDepth = (node) => {
  const children = node?.children || [];
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map(maxSubtreeDepth));
};

/**
 * Children currently visible for layout / rendering.
 *  - collapsedIds: parent IDs whose whole subtree is hidden
 *  - expanding: { rootId, depth } progressive reveal while opening a branch
 *  - depthFromExpandRoot: 0 at expanding root, null outside that branch
 */
export const getVisibleChildren = (node, opts = {}, depthFromExpandRoot = null) => {
  const person = node?.person || node;
  const personId = person?.id != null ? String(person.id) : null;
  const collapsedIds = opts.collapsedIds;
  const expanding = opts.expanding;

  if (personId && collapsedIds?.has(personId)) return [];

  let depth = depthFromExpandRoot;
  if (expanding && personId && personId === String(expanding.rootId)) {
    depth = 0;
  }
  if (expanding && depth != null && depth >= expanding.depth) {
    return [];
  }

  return sortChildren(node?.children || []);
};

/**
 * Measures a subtree and decides where each child goes, as offsets from this
 * node's own position. Placement later replays these offsets verbatim, so the
 * space a subtree is measured to need is exactly the space it occupies —
 * that agreement is what keeps sibling subtrees from overlapping.
 *
 * Returns { left, right, height, children, placements } where left/right are
 * signed horizontal offsets bounding the whole subtree and `height` is its
 * vertical extent measured from this node's row.
 *
 * @param {object} [opts] collapse / progressive-expand options
 * @param {number|null} [depthFromExpandRoot] depth under an expanding root
 */
export const measureSubtree = (node, level, layoutMode, cache, opts = {}, depthFromExpandRoot = null) => {
  const person = node.person || node;
  const personId = person?.id != null ? String(person.id) : '';
  let depth = depthFromExpandRoot;
  if (opts.expanding && personId && personId === String(opts.expanding.rootId)) {
    depth = 0;
  }

  const cacheKey = `${personId}|${level}|${depth ?? 'x'}|${opts.expanding?.depth ?? ''}|${opts.collapsedIds ? [...opts.collapsedIds].join(',') : ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const children = getVisibleChildren(node, opts, depth);

  if (children.length === 0) {
    const leaf = { left: -NODE_SLOT / 2, right: NODE_SLOT / 2, height: ROW_PITCH, children: [], placements: [], orientation: resolveChildOrientation(layoutMode, level, person) };
    cache.set(cacheKey, leaf);
    return leaf;
  }

  const childDepth = depth == null ? null : depth + 1;
  const childMeasures = children.map(child => measureSubtree(child, level + 1, layoutMode, cache, opts, childDepth));
  const placements = [];
  let left;
  let right;
  let height;

  const orientation = resolveChildOrientation(layoutMode, level, person);

  if (orientation === 'HORIZONTAL') {
    // Stacked column. The connector to each child runs down a vertical spine at
    // the parent's own x, so NOTHING in the subtree may sit left of that spine —
    // otherwise a later sibling's connector is drawn straight through an earlier
    // sibling's descendants. Indent the whole column past the widest child's
    // left overhang, and use one shared indent so the column stays aligned.
    const overhang = Math.max(0, ...childMeasures.map(m => -m.left));
    const dx = STACK_INDENT + overhang;
    let dy = ROW_PITCH;
    childMeasures.forEach((measure) => {
      placements.push({ dx, dy });
      dy += measure.height;
    });
    left = -NODE_SLOT / 2;
    right = Math.max(NODE_SLOT / 2, ...childMeasures.map(m => dx + m.right));
    height = dy;
  } else {
    // Row, centred under the parent. Each child gets a slot as wide as its subtree.
    const widths = childMeasures.map(m => m.right - m.left);
    const total = widths.reduce((a, b) => a + b, 0);
    let cursor = -total / 2;
    childMeasures.forEach((measure, index) => {
      placements.push({ dx: cursor - measure.left, dy: LEVEL_GAP });
      cursor += widths[index];
    });
    left = Math.min(-NODE_SLOT / 2, -total / 2);
    right = Math.max(NODE_SLOT / 2, total / 2);
    height = LEVEL_GAP + Math.max(...childMeasures.map(m => m.height));
  }

  const result = { left, right, height, children, placements, orientation };
  cache.set(cacheKey, result);
  return result;
};
