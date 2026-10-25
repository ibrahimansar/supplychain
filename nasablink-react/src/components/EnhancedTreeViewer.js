import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from './ui/Button';
import { LoadingSpinner } from './ui/Loading';
import AddSpouseModal from './AddSpouseModal';
import { treeAPI, smartSearchPersons } from '../services/api';

const EnhancedTreeViewer = ({ onPersonClick, onAddDescendant, refreshTrigger = 0, focusedPersonId }) => {
  const [treeData, setTreeData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [focusedLineage, setFocusedLineage] = useState(new Set());
  const [selectedPath, setSelectedPath] = useState([]);
  
  // Spouse modal state
  const [showSpouseModal, setShowSpouseModal] = useState(false);
  const [selectedPersonForSpouse, setSelectedPersonForSpouse] = useState(null);
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef(null);
  const treeRef = useRef(null);

  // Helper function to recursively get all node IDs from tree data
  const getAllNodeIds = useCallback((node) => {
    if (!node) return [];
    const ids = [node.person?.id || node.id];
    if (node.children) {
      node.children.forEach(child => {
        ids.push(...getAllNodeIds(child));
      });
    }
    return ids.filter(id => id);
  }, []);

  const loadRootTree = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSearchResults([]); // Clear search results when refreshing
      setSelectedPath([]); // Clear selected path
      const response = await treeAPI.getTree();
      setTreeData(response.data);
      
      // Expand ALL nodes by default to show all descendants
      const allNodeIds = getAllNodeIds(response.data);
      setExpandedNodes(new Set(allNodeIds));
      
    } catch (error) {
      setError('Failed to load family tree');
      console.error('Error loading tree:', error);
    } finally {
      setLoading(false);
    }
  }, [getAllNodeIds]);

  useEffect(() => {
    loadRootTree();
  }, [refreshTrigger, loadRootTree]);

  // Seamless add person function
  const addPersonToTree = useCallback((newPerson, parentId) => {
    setTreeData(prevTree => {
      if (!prevTree) return prevTree;
      
      const addPersonToNode = (node) => {
        if (node.person && node.person.id === parentId) {
          // Add the new person as a child
          const newChild = {
            person: newPerson,
            children: []
          };
          
          return {
            ...node,
            children: [...(node.children || []), newChild]
          };
        }
        
        // Recursively search in children
        if (node.children) {
          return {
            ...node,
            children: node.children.map(addPersonToNode)
          };
        }
        
        return node;
      };
      
      return addPersonToNode(prevTree);
    });
    
    // Expand the parent node to show the new child
    setExpandedNodes(prev => new Set([...prev, parentId]));
  }, []);

  // Expose the function globally for seamless updates
  useEffect(() => {
    window.addPersonToTree = addPersonToTree;
    return () => {
      delete window.addPersonToTree;
    };
  }, [addPersonToTree]);

  // Handle focused person changes
  useEffect(() => {
    if (focusedPersonId && treeData) {
      // Find the lineage of the focused person
      const lineage = findPersonLineage(treeData, focusedPersonId);
      setFocusedLineage(new Set(lineage));
      
      // Expand only the focused lineage nodes
      setExpandedNodes(new Set(lineage));
    } else if (treeData) {
      // If no focused person, show all descendants
      const allNodeIds = getAllNodeIds(treeData);
      setExpandedNodes(new Set(allNodeIds));
      setFocusedLineage(new Set());
    }
  }, [focusedPersonId, treeData, findPersonLineage, getAllNodeIds]);

  // Handle window resize to maintain proper centering
  useEffect(() => {
    const centerTree = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Center the tree with some offset to account for tree dimensions
        setPosition({ x: centerX - 200, y: centerY - 300 });
      }
    };

    const handleResize = () => {
      // Small delay to ensure DOM has updated
      setTimeout(centerTree, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Set initial position when component mounts and after tree loads
    const timer = setTimeout(centerTree, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [treeData]);

  // Handle keyboard zoom controls (+ and - keys)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only respond if the tree container is focused or no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '+' || e.key === '=' || e.keyCode === 107) { // + key or numpad +
        e.preventDefault();
        setScale(prevScale => Math.min(prevScale * 1.2, 3)); // Max zoom 3x
      } else if (e.key === '-' || e.keyCode === 109) { // - key or numpad -
        e.preventDefault();
        setScale(prevScale => Math.max(prevScale / 1.2, 0.3)); // Min zoom 0.3x
      } else if (e.key === '0' || e.keyCode === 96) { // Reset zoom with 0 key
        e.preventDefault();
        setScale(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []); // Fixed: Added missing closing for useEffect

  // Helper function to find complete lineage of a person (ancestors + descendants)
  const findPersonLineage = useCallback((node, targetId, path = []) => {
    if (!node) return [];
    
    const currentId = node.person?.id || node.id;
    const currentPath = [...path, currentId];
    
    // If we found the target person, return the path and all descendants
    if (currentId === targetId) {
      const descendants = getAllNodeIds(node);
      return [...currentPath, ...descendants];
    }
    
    // Search in children
    if (node.children) {
      for (const child of node.children) {
        const result = findPersonLineage(child, targetId, currentPath);
        if (result.length > 0) {
          return result;
        }
      }
    }
    
    return [];
  }, [getAllNodeIds]);

  const handleNodeExpand = useCallback(async (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
      // Also collapse all descendants
      // TODO: Implement descendant collapse logic when needed
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  }, [expandedNodes]);

  // Search functionality
  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await smartSearchPersons(term);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const jumpToPerson = async (personId) => {
    try {
      // Get the path from root to this person
      const response = await treeAPI.getPersonPath(personId);
      const path = response.data;
      
      // Expand all nodes in the path
      const newExpanded = new Set(expandedNodes);
      path.forEach(p => newExpanded.add(p.id));
      setExpandedNodes(newExpanded);
      
      // Highlight the path
      setSelectedPath(path.map(p => p.id));
      
      // Center the view on the person
      // This would require calculating the person's position in the tree
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error jumping to person:', error);
    }
  };

  // Handle spouse modal
  const handleAddSpouse = useCallback((person) => {
    setSelectedPersonForSpouse(person);
    setShowSpouseModal(true);
  }, []);

  const handleSpouseAdded = useCallback((updatedData) => {
    setShowSpouseModal(false);
    setSelectedPersonForSpouse(null);
    // Refresh the tree data
    loadRootTree();
  }, [loadRootTree]);

  const handleCloseSpouseModal = useCallback(() => {
    setShowSpouseModal(false);
    setSelectedPersonForSpouse(null);
  }, []);

  // Zoom and pan handlers
  const handleWheel = (e) => {
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.25, Math.min(3, scale * delta));
    const scaleRatio = newScale / scale;
    
    setPosition({
      x: centerX - (centerX - position.x) * scaleRatio,
      y: centerY - (centerY - position.y) * scaleRatio
    });
    setScale(newScale);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      setPosition({ x: centerX - 200, y: centerY - 300 });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  const zoomIn = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      setScale(prev => Math.min(3, prev * 1.2));
      return;
    }
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newScale = Math.min(3, scale * 1.2);
    const scaleRatio = newScale / scale;
    
    setPosition({
      x: centerX - (centerX - position.x) * scaleRatio,
      y: centerY - (centerY - position.y) * scaleRatio
    });
    setScale(newScale);
  };

  const zoomOut = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      setScale(prev => Math.max(0.25, prev / 1.2));
      return;
    }
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newScale = Math.max(0.25, scale / 1.2);
    const scaleRatio = newScale / scale;
    
    setPosition({
      x: centerX - (centerX - position.x) * scaleRatio,
      y: centerY - (centerY - position.y) * scaleRatio
    });
    setScale(newScale);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted dark:text-gray-400">Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <Button onClick={loadRootTree}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50">
      {/* Controls Bar */}
      <div className="absolute top-4 start-4 end-4 z-20 flex justify-between items-start">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="form-input w-64 ps-10"
          />
          <svg
            className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full start-0 end-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto scrollbar-hidden z-30">
              {searchResults.map((person) => (
                <button
                  key={person.id}
                  onClick={() => jumpToPerson(person.id)}
                  className="w-full text-start px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium">{person.name}</div>
                  {person.arabicName && (
                    <div className="text-sm text-gray-500 arabic-text">{person.arabicName}</div>
                  )}
                  {person.title && (
                    <div className="text-sm text-primary-600">{person.title}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-2">
            <button onClick={zoomOut} className="p-2 hover:bg-gray-100 rounded" title="Zoom Out (- key)">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm font-medium w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={zoomIn} className="p-2 hover:bg-gray-100 rounded" title="Zoom In (+ key)">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button onClick={resetView} className="p-2 hover:bg-gray-100 rounded text-xs" title="Reset View (0 key)">
              Reset
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">
            Use +/- keys to zoom, 0 to reset
          </div>
        </div>
      </div>

      {/* Tree Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ minHeight: '100vh', minWidth: '100vw' }}
      >
        <div
          ref={treeRef}
          className={`absolute top-0 left-0 transition-transform duration-200 tree-viewer ${focusedPersonId ? 'has-focus' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {treeData && (
            <EnhancedTreeNode
              node={treeData}
              level={0}
              isExpanded={expandedNodes.has(treeData.person?.id || treeData.id)}
              onExpand={handleNodeExpand}
              onPersonClick={onPersonClick}
              onAddDescendant={onAddDescendant}
              onAddSpouse={handleAddSpouse}
              expandedNodes={expandedNodes}
              selectedPath={selectedPath}
              focusedLineage={focusedLineage}
              focusedPersonId={focusedPersonId}
              isRoot={true}
            />
          )}
        </div>
      </div>

      {/* Spouse Modal */}
      {showSpouseModal && selectedPersonForSpouse && (
        <AddSpouseModal
          person={selectedPersonForSpouse}
          treeId={treeAPI._id()}
          onClose={handleCloseSpouseModal}
          onSpouseAdded={handleSpouseAdded}
        />
      )}

      {/* Minimap */}
      <div className="absolute bottom-4 end-4 w-48 h-32 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20">
        <div className="w-full h-full bg-gray-100 rounded-lg relative overflow-hidden">
          <div className="text-xs text-gray-500 p-2">Tree Overview</div>
          {/* Minimap content would show a simplified view of the tree */}
          <div className="absolute inset-2 border border-primary-500 opacity-50 rounded"
               style={{
                 left: `${2 + (position.x / -50)}px`,
                 top: `${2 + (position.y / -50)}px`,
                 width: `${(100 / scale)}px`,
                 height: `${(60 / scale)}px`
               }}>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced TreeNode component with performance optimizations
const EnhancedTreeNode = React.memo(({ 
  node, 
  level, 
  isExpanded, 
  onExpand, 
  onPersonClick,
  onAddDescendant,
  onAddSpouse,
  expandedNodes,
  selectedPath,
  focusedLineage = new Set(),
  focusedPersonId,
  isRoot = false 
}) => {
  const person = node.person || node;
  const treeChildren = node.children || [];
  const isHighlighted = selectedPath.includes(person.id);
  const isInFocusedLineage = focusedLineage.has(person.id);
  const isFocusedPerson = person.id === focusedPersonId;

  // Only render children if expanded and not too deep (performance optimization)
  const shouldRenderChildren = isExpanded && level < 15; // Increased depth limit

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
      <div className={`tree-person-node ${isRoot ? 'root-node' : ''} ${
        isFocusedPerson ? 'focused-person' : 
        isInFocusedLineage ? 'focused-lineage' : 
        isHighlighted ? 'highlighted' : ''
      }`}>
        <div className="person-card" onClick={() => onPersonClick(person.id)}>
          <div className="person-info">
            <div className="person-name">
              {person.name}
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
          
          {/* Expand/Collapse Button */}
          {treeChildren.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(person.id);
              }}
              className="expand-button"
            >
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
            </button>
          )}

          {/* Edit Person Button (only for root) */}
          {isRoot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPersonClick(person.id);
              }}
              className="edit-person-button"
              title="Edit person"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>

        {/* Add Descendant Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddDescendant(person);
          }}
          className="add-descendant-button"
          title="Add descendant"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Add Spouse Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSpouse && onAddSpouse(person);
          }}
          className="add-spouse-button"
          title="Add spouse"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Children */}
      {shouldRenderChildren && treeChildren.length > 0 && (
        <div className="tree-children">
          {/* Connection lines with arrows */}
          {treeChildren.length === 1 && (
            <div className="single-child-connector">
              <div className="vertical-line"></div>
              <div className="arrow-down"></div>
            </div>
          )}
          
          {treeChildren.length > 1 && (
            <div className="multiple-children-connector">
              <div className="main-vertical-line"></div>
              <div className="horizontal-distribution-line"></div>
              {/* Individual arrows for each child */}
              {treeChildren.map((child, index) => (
                <div 
                  key={child.person?.id || child.id}
                  className="child-connector-arrow"
                  style={{ 
                    left: `${(100 / treeChildren.length) * index + (100 / treeChildren.length / 2)}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="vertical-arrow-line"></div>
                  <div className="arrow-down"></div>
                </div>
              ))}
            </div>
          )}
          
          {/* Children Grid */}
          <div className="children-grid">
            {treeChildren.map((child) => {
              const childPerson = child.person || child;
              
              return (
                <div key={childPerson.id} className="child-wrapper">
                  <EnhancedTreeNode
                    node={child}
                    level={level + 1}
                    isExpanded={expandedNodes.has(childPerson.id)}
                    onExpand={onExpand}
                    onPersonClick={onPersonClick}
                    onAddDescendant={onAddDescendant}
                    expandedNodes={expandedNodes}
                    selectedPath={selectedPath}
                    focusedLineage={focusedLineage}
                    focusedPersonId={focusedPersonId}
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
});

export default EnhancedTreeViewer;
