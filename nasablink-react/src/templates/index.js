import familyTemplate from './family';
import orgTemplate from './org';

/**
 * @typedef {Object} TemplateField
 * @property {string} id
 * @property {string} label
 * @property {string} type
 * @property {boolean} required
 */

/**
 * @typedef {Object} WorkspaceTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {boolean} available
 * @property {string} defaultLayout
 * @property {Object} labels
 * @property {Object} features
 * @property {Array} nodeTypes
 * @property {Array} edgeTypes
 * @property {Array} actions
 */

export const DEFAULT_TEMPLATE_ID = 'family';

/** @type {Record<string, WorkspaceTemplate>} */
const TEMPLATES = {
  [familyTemplate.id]: familyTemplate,
  [orgTemplate.id]: orgTemplate,
};

/**
 * @param {string} [id]
 * @returns {WorkspaceTemplate}
 */
export function getTemplate(id) {
  const key = (id || DEFAULT_TEMPLATE_ID).toLowerCase();
  return TEMPLATES[key] || TEMPLATES[DEFAULT_TEMPLATE_ID];
}

/** @returns {WorkspaceTemplate[]} */
export function listTemplates() {
  return Object.values(TEMPLATES);
}

/** @returns {WorkspaceTemplate[]} */
export function listAvailableTemplates() {
  return listTemplates().filter((t) => t.available);
}

/**
 * @param {WorkspaceTemplate} template
 * @param {string} key
 * @param {string} [fallback]
 */
export function templateLabel(template, key, fallback = '') {
  const labels = template?.labels || {};
  const value = labels[key];
  if (value == null || value === '') return fallback;
  return value;
}

/**
 * @param {WorkspaceTemplate} template
 * @param {string} feature
 */
export function hasFeature(template, feature) {
  return Boolean(template?.features?.[feature]);
}

export { familyTemplate, orgTemplate };
