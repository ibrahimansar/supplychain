import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sampleTrees, getSampleTreeByLocale } from '../utils/sampleTrees';
import api from '../services/api';

const SampleTreeSelector = ({ onTreeCreated, onClose }) => {
  const { t, i18n } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateFromTemplate = async (templateKey) => {
    setIsCreating(true);
    setError(null);
    
    try {
      const template = sampleTrees[templateKey];
      
      // Create the tree
      const treeResponse = await api.post('/api/trees', {
        name: template.name,
        description: template.description,
      });
      
      const treeId = treeResponse.data.id;
      
      // Create all people
      const personIdMap = {}; // Map template IDs to real IDs
      for (const person of template.people) {
        const personResponse = await api.post(`/api/trees/${treeId}/persons`, {
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
          birthDate: person.birthDate,
          deathDate: person.deathDate,
          placeOfBirth: person.placeOfBirth,
          occupation: person.occupation,
          isAlive: person.isAlive,
        });
        personIdMap[person.id] = personResponse.data.id;
      }
      
      // Create all relationships
      for (const rel of template.relationships) {
        if (rel.type === 'spouse') {
          await api.post(`/api/trees/${treeId}/relationships`, {
            type: 'SPOUSE',
            person1Id: personIdMap[rel.person1Id],
            person2Id: personIdMap[rel.person2Id],
          });
        } else if (rel.type === 'parent') {
          await api.post(`/api/trees/${treeId}/relationships`, {
            type: 'PARENT',
            person1Id: personIdMap[rel.parentId],
            person2Id: personIdMap[rel.childId],
          });
        }
      }
      
      onTreeCreated(treeId);
    } catch (err) {
      console.error('Error creating sample tree:', err);
      setError(err.response?.data?.message || 'Failed to create tree from template');
    } finally {
      setIsCreating(false);
    }
  };

  const templates = Object.entries(sampleTrees);
  const recommendedTemplate = getSampleTreeByLocale(i18n.language);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('sample_trees.title', 'Sample Family Trees')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('sample_trees.subtitle', 'Start with a pre-populated template and customize it')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Templates Grid */}
        <div className="p-6 grid gap-4 md:grid-cols-2">
          {templates.map(([key, template]) => {
            const isRecommended = template === recommendedTemplate;
            return (
              <div
                key={key}
                className={`
                  border rounded-lg p-5 cursor-pointer transition-all
                  ${selectedTemplate === key
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }
                  ${isCreating ? 'opacity-50 pointer-events-none' : ''}
                `}
                onClick={() => setSelectedTemplate(key)}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded">
                      {t('sample_trees.recommended', 'Recommended')}
                    </span>
                  </div>
                )}

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {template.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{template.people.length} {t('sample_trees.people', 'people')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>{template.relationships.length} {t('sample_trees.relationships', 'connections')}</span>
                  </div>
                </div>

                {/* Sample Names Preview */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('sample_trees.includes', 'Includes:')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.people.slice(0, 3).map((person, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded"
                      >
                        {person.firstName}
                      </span>
                    ))}
                    {template.people.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                        +{template.people.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => selectedTemplate && handleCreateFromTemplate(selectedTemplate)}
            disabled={!selectedTemplate || isCreating}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('sample_trees.creating', 'Creating...')}
              </>
            ) : (
              t('sample_trees.create', 'Create from Template')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SampleTreeSelector;
