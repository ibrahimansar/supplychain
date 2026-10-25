import React, { createContext, useContext, useMemo } from 'react';
import { getTemplate, templateLabel, hasFeature, DEFAULT_TEMPLATE_ID } from '../templates';

const TemplateContext = createContext({
  templateId: DEFAULT_TEMPLATE_ID,
  template: getTemplate(DEFAULT_TEMPLATE_ID),
  label: (key, fallback) => templateLabel(getTemplate(DEFAULT_TEMPLATE_ID), key, fallback),
  hasFeature: (feature) => hasFeature(getTemplate(DEFAULT_TEMPLATE_ID), feature),
});

/**
 * Provides the workspace template for the current tree.
 * Pass templateId from tree info (defaults to family).
 */
export function TemplateProvider({ templateId = DEFAULT_TEMPLATE_ID, children }) {
  const value = useMemo(() => {
    const template = getTemplate(templateId);
    return {
      templateId: template.id,
      template,
      label: (key, fallback) => templateLabel(template, key, fallback),
      hasFeature: (feature) => hasFeature(template, feature),
    };
  }, [templateId]);

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useWorkspaceTemplate() {
  return useContext(TemplateContext);
}

export default TemplateContext;
