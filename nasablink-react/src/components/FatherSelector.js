import React, { useState, useEffect } from 'react';
import { treeAPI } from '../services/api';
import { LoadingSpinner } from './ui/Loading';

const FatherSelectorNode = ({ node, level, selectedFatherId, onSelect, onExpand, expandedNodes }) => {
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState(node.children || []);
  const [hasLoadedChildren, setHasLoadedChildren] = useState(false);

  const isExpanded = expandedNodes.has(node.person.id);
  const hasChildren = children.length > 0;
  const isMale = node.person.gender === 'MALE';
  const isSelected = selectedFatherId === node.person.id;

  const loadChildren = async () => {
    if (hasLoadedChildren || loading) return;

    setLoading(true);
    try {
      const response = await treeAPI.getChildren(node.person.id);
      setChildren(response.data || []);
      setHasLoadedChildren(true);
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!hasChildren && !hasLoadedChildren) {
      await loadChildren();
    }
    onExpand(node.person.id);
  };

  const handleSelect = () => {
    if (isMale) {
      onSelect(node.person.id, node.person.name);
    }
  };

  const indentationStyle = { marginLeft: `${level * 24}px` };

  return (
    <div className="father-selector-node">
      <div
        className={`flex items-center justify-between p-2 mb-1 rounded-lg border transition-colors ${
          isSelected
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        style={indentationStyle}
      >
        <div className="flex items-center space-x-3">
          {(hasChildren || !hasLoadedChildren) && (
            <button
              onClick={handleToggle}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
            >
              {loading ? (
                <LoadingSpinner size="xs" color="gray" />
              ) : (
                <svg
                  className={`h-4 w-4 transform transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          )}
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelect}
              disabled={!isMale}
              className={`text-left ${
                isMale
                  ? 'text-gray-900 dark:text-gray-100 hover:text-primary-600 cursor-pointer'
                  : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="font-medium">
                {node.person.name}
                {node.person.arabicName && (
                  <span className="arabic-text ms-2 text-gray-600">
                    ({node.person.arabicName})
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                ID: {node.person.id}
                {node.person.birthYear && ` • Born: ${node.person.birthYear}`}
                {!isMale && ' • Female (cannot be selected as father)'}
              </div>
            </button>
            
            {isSelected && (
              <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ms-4">
          {children.map((child) => (
            <FatherSelectorNode
              key={child.person.id}
              node={child}
              level={level + 1}
              selectedFatherId={selectedFatherId}
              onSelect={onSelect}
              onExpand={onExpand}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FatherSelector = ({ selectedFatherId, selectedFatherName, onSelect }) => {
  const [treeData, setTreeData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    try {
      setLoading(true);
      const response = await treeAPI.getTree();
      setTreeData(response.data);
      // Auto-expand the root node
      setExpandedNodes(new Set([response.data.person.id]));
    } catch (error) {
      setError('Failed to load family tree');
      console.error('Error loading tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeExpand = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelect = (fatherId, fatherName) => {
    onSelect(fatherId, fatherName);
    setIsOpen(false);
  };

  return (
    <div className="father-selector">
      <label className="form-label">Father *</label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`form-input w-full text-left flex items-center justify-between ${
            selectedFatherId ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          <span>
            {selectedFatherName || 'Select your father from the family tree'}
          </span>
          <svg
            className={`h-4 w-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto scrollbar-hidden">
            <div className="p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Select Father from Family Tree
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Navigate the tree and click on a male family member to select as father.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                  <span className="ms-2 text-gray-600 dark:text-gray-400">Loading tree...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">{error}</div>
                  <button
                    onClick={loadTree}
                    className="text-sm text-primary-600 hover:text-primary-800"
                  >
                    Try Again
                  </button>
                </div>
              ) : treeData ? (
                <div className="max-h-64 overflow-y-auto scrollbar-hidden">
                  <FatherSelectorNode
                    node={treeData}
                    level={0}
                    selectedFatherId={selectedFatherId}
                    onSelect={handleSelect}
                    onExpand={handleNodeExpand}
                    expandedNodes={expandedNodes}
                  />
                </div>
              ) : null}

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedFatherId && (
        <p className="mt-1 text-sm text-gray-600">
          Selected: {selectedFatherName} (ID: {selectedFatherId})
        </p>
      )}
    </div>
  );
};

export default FatherSelector;
