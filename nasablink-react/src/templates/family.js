/** @typedef {import('./index').WorkspaceTemplate} WorkspaceTemplate */

/** @type {WorkspaceTemplate} */
const familyTemplate = {
  id: 'family',
  name: 'Family / Nasab',
  description: 'Kinship trees with parents, children, spouses, and cultural naming.',
  available: true,
  defaultLayout: 'DEFAULT',
  nodeTypes: [
    {
      id: 'person',
      label: 'Person',
      fields: [
        { id: 'name', label: 'Name', type: 'string', required: true },
        { id: 'arabicName', label: 'Arabic name', type: 'string', required: false },
        { id: 'gender', label: 'Gender', type: 'enum', required: true },
        { id: 'birthYear', label: 'Birth year', type: 'number', required: false },
        { id: 'deathYear', label: 'Death year', type: 'number', required: false },
        { id: 'noHeir', label: 'No heir', type: 'boolean', required: false },
      ],
    },
  ],
  edgeTypes: [
    {
      id: 'parent_child',
      label: 'Parent → child',
      from: 'person',
      to: 'person',
      storage: 'PARENT_CHILD',
      allowsCycles: false,
    },
    {
      id: 'spouse',
      label: 'Spouse',
      from: 'person',
      to: 'person',
      storage: 'SPOUSE',
      symmetric: true,
    },
  ],
  actions: [
    { id: 'addChild', edgeType: 'parent_child', label: 'Add descendant' },
    { id: 'addParent', edgeType: 'parent_child', label: 'Add parent' },
    { id: 'addSpouse', edgeType: 'spouse', label: 'Add spouse' },
    { id: 'editNode', label: 'Edit person' },
    { id: 'deleteNode', label: 'Delete person' },
  ],
  labels: {
    workspace: 'Family tree',
    node: 'Person',
    addChild: 'Add descendant',
    addParent: 'Add parent',
    addSpouse: 'Add spouse',
    addMember: 'Add family member',
    editNode: 'Edit person',
    deleteNode: 'Delete person',
    emptyRootHint: 'Add the root ancestor to begin your family tree',
    defaultName: 'My Family Tree',
  },
  features: {
    spouses: true,
    gender: true,
    noHeir: true,
    gedcom: true,
    generationalLayout: true,
    culturalNames: true,
  },
};

export default familyTemplate;
