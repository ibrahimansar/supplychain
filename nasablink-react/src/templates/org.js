/** @typedef {import('./index').WorkspaceTemplate} WorkspaceTemplate */

/** @type {WorkspaceTemplate} */
const orgTemplate = {
  id: 'org',
  name: 'Org chart',
  description: 'Reporting hierarchy for teams and roles. Early platform template.',
  available: false,
  defaultLayout: 'DEFAULT',
  nodeTypes: [
    {
      id: 'person',
      label: 'Member',
      fields: [
        { id: 'name', label: 'Name', type: 'string', required: true },
        { id: 'title', label: 'Title', type: 'string', required: false },
        { id: 'description', label: 'Notes', type: 'string', required: false },
      ],
    },
  ],
  edgeTypes: [
    {
      id: 'reports_to',
      label: 'Reports to',
      from: 'person',
      to: 'person',
      storage: 'PARENT_CHILD',
      allowsCycles: false,
    },
  ],
  actions: [
    { id: 'addChild', edgeType: 'reports_to', label: 'Add report' },
    { id: 'addParent', edgeType: 'reports_to', label: 'Add manager' },
    { id: 'editNode', label: 'Edit member' },
    { id: 'deleteNode', label: 'Delete member' },
  ],
  labels: {
    workspace: 'Org chart',
    node: 'Member',
    addChild: 'Add report',
    addParent: 'Add manager',
    addSpouse: '',
    addMember: 'Add team member',
    editNode: 'Edit member',
    deleteNode: 'Delete member',
    emptyRootHint: 'Add the top leader to begin your org chart',
    defaultName: 'My Org Chart',
  },
  features: {
    spouses: false,
    gender: false,
    noHeir: false,
    gedcom: false,
    generationalLayout: true,
    culturalNames: false,
  },
};

export default orgTemplate;
