import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './ui/Loading';

const TreeNode = ({ 
  node, 
  level, 
  isExpanded, 
  onExpand, 
  onPersonClick, 
  loadChildren, 
  expandedNodes,
  onAddDescendant,
  onAddSpouse,
  isRoot = false 
}) => {
  // Extract person and children from the TreeNode structure
  const person = node.person || node; // Support both TreeNode format and direct person format
  const treeChildren = node.children || [];
  const hasChildren = treeChildren.length > 0;

  const [dynamicChildren, setDynamicChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedChildren, setHasLoadedChildren] = useState(false);

  useEffect(() => {
    if (isExpanded && !hasLoadedChildren && !hasChildren && person.id) {
      // Only load children dynamically if not already provided in the tree structure
      loadNodeChildren();
    }
  }, [isExpanded]);

  const loadNodeChildren = async () => {
    setLoading(true);
    try {
      const childrenData = await loadChildren(person.id);
      setDynamicChildren(childrenData);
      setHasLoadedChildren(true);
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    onExpand(person.id);
  };

  const handlePersonClick = () => {
    onPersonClick(person.id);
  };

  // Use tree children if available, otherwise use dynamically loaded children
  const childrenToRender = hasChildren ? treeChildren : dynamicChildren;
  const showExpandButton = hasChildren || dynamicChildren.length > 0 || (!hasLoadedChildren && level < 5);

  return (
    <div className={`tree-node-wrapper ${isRoot ? 'tree-root' : ''}`}>
      {/* Connecting Lines */}
      {!isRoot && (
        <div className="tree-connector">
          <div className="tree-line-vertical"></div>
          <div className="tree-line-horizontal"></div>
        </div>
      )}
      
      {/* Person Node */}
      <div className={`tree-person-node ${isRoot ? 'root-node' : ''}`}>
        <div className="person-card" onClick={handlePersonClick}>
          <div className="person-info">
            <div className="person-name">
              {person.name}
              {person.noHeir && (
                <span 
                  className="no-heir-badge ms-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full" 
                  title="No heir"
                >
                  ⊘
                </span>
              )}
              {person.arabicName && (
                <div className="arabic-text text-sm text-gray-600">
                  {person.arabicName}
                </div>
              )}
            </div>
            {person.title && (
              <div className="person-title">{person.title}</div>
            )}
            <div className="person-dates">
              {person.birthYear && <span>b. {person.birthYear}</span>}
              {person.deathYear && <span>d. {person.deathYear}</span>}
            </div>
          </div>
          
          {showExpandButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              className="expand-button"
            >
              {loading ? (
                <LoadingSpinner size="xs" />
              ) : (
                <svg
                  className={`h-4 w-4 transform transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>
          )}
          
          {/* Add Descendant Button - disabled if person is marked as no heir */}
          {!person.noHeir && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddDescendant && onAddDescendant(person);
              }}
              className="add-descendant-button"
              title={`Add descendant to ${person.name}`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}

          {/* Add Spouse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSpouse && onAddSpouse(person);
            }}
            className="add-spouse-button"
            title={`Add spouse to ${person.name}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Children Container */}
      {isExpanded && childrenToRender.length > 0 && (
        <div className="tree-children">
          {/* For single child: direct vertical line */}
          {childrenToRender.length === 1 && (
            <div className="children-connector-vertical"></div>
          )}
          
          {/* For multiple children: vertical line + horizontal line + individual connectors */}
          {childrenToRender.length > 1 && (
            <>
              <div className="children-connector-vertical"></div>
              <div 
                className="children-connector-horizontal"
                style={{
                  left: '25%',
                  right: '25%'
                }}
              ></div>
            </>
          )}
          
          {/* Children Nodes */}
          <div className="children-grid">
            {childrenToRender.map((child, index) => {
              const childPerson = child.person || child;
              const isMultipleChildren = childrenToRender.length > 1;
              
              return (
                <div key={childPerson.id} className="child-wrapper">
                  {/* Individual vertical connector for each child when multiple children */}
                  {isMultipleChildren && (
                    <div className="individual-child-connector"></div>
                  )}
                  
                  <TreeNode
                    node={child}
                    level={level + 1}
                    isExpanded={expandedNodes.has(childPerson.id)}
                    onExpand={onExpand}
                    onPersonClick={onPersonClick}
                    loadChildren={loadChildren}
                    expandedNodes={expandedNodes}
                    onAddDescendant={onAddDescendant}
                    isRoot={false}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeNode;
