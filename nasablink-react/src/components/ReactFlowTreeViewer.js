import IconButton from '@mui/material/IconButton';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import ZoomOutOutlinedIcon from '@mui/icons-material/ZoomOutOutlined';
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined';
import PrintIcon from '@mui/icons-material/Print';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  MarkerType,
  Handle,
  Position,
  BaseEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { treeAPI, smartSearchPersons } from '../services/api';
import { measureSubtree, countDescendants as countSubtreeSize, maxSubtreeDepth } from '../utils/treeLayout';
import Button from './ui/Button';
import { LoadingSpinner } from './ui/Loading';
import DeletePersonConfirmDialog from './DeletePersonConfirmDialog';
import ShareButton from './ShareButton';

/** Counter-scale labels so zoom-out keeps names readable and zoom-in doesn't blow them up.
 *  Kept modest so text stays inside the fixed node card with padding. */
const labelScaleForZoom = (zoom) => {
  const z = Math.max(0.05, Number(zoom) || 1);
  return Math.min(1.55, Math.max(0.8, 1 / z));
};

// Error boundary specifically for ReactFlow to suppress ResizeObserver errors
class ReactFlowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    const roPatterns = [
      /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
      /ResizeObserver loop/i,
      /ResizeObserver.*loop/i,
      /loop.*ResizeObserver/i
    ];

    const isResizeObserverError = error?.message && (
      roPatterns.some(pattern => pattern.test(error.message)) ||
      error.name === 'ResizeObserverLoopError'
    );

    if (isResizeObserverError) {
      // Silently ignore ResizeObserver errors
      console.warn('ResizeObserver error suppressed:', error.message);
      return { hasError: false };
    }

    // For other errors, show the error boundary
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const roPatterns = [
      /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
      /ResizeObserver loop/i,
      /ResizeObserver.*loop/i,
      /loop.*ResizeObserver/i
    ];

    const isResizeObserverError = error?.message && (
      roPatterns.some(pattern => pattern.test(error.message)) ||
      error.name === 'ResizeObserverLoopError'
    );

    if (isResizeObserverError) {
      // Silently ignore ResizeObserver errors - don't even log them
      return;
    }

    // For other errors, log them
    console.error('ReactFlow Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Error loading tree viewer</div>;
    }

    return this.props.children;
  }
}

// Custom Node Component for Family Tree - Memoized for performance
const FamilyNode = React.memo(({ data }) => {
  const {
    person, spouseInline, onPersonClick, onAddDescendant, onAddParent, onViewPerson, onEditPerson,
    onDeletePerson, onNavigateToNode, onToggleCollapse, isRoot, isFocused, isInLineage, readOnly,
    isLineageConnection, isCollapsed, collapsedDescendantCount, hasChildren, enterDelay,
    getCrossTreeLinks, onCrossTreeNavigate, actionLabels,
  } = data;
  const addParentTitle = actionLabels?.addParent || 'Add parent';
  const addMemberTitle = actionLabels?.addMember || 'Add family member';
  const viewTitle = actionLabels?.viewNode || 'View details';
  const editTitle = actionLabels?.editNode || 'Edit person';
  const deleteTitle = actionLabels?.deleteNode || 'Delete person';
  const [isHovered, setIsHovered] = useState(false);

  // Determine if action buttons should be visible
  const showActionButtons = isHovered;
  const showViewButton = showActionButtons && !!onViewPerson;
  const showEditButton = !readOnly && showActionButtons;
  const showAddDescendantButton = showActionButtons;
  const showDeleteButton = !readOnly && showActionButtons;

  // Determine primary/secondary name language by tree setting
  let primary = 'en', secondary = 'ar';
  try {
    const id = typeof window !== 'undefined' ? window.NASAB_CURRENT_TREE_ID : null;
    if (id) {
      const cfg = localStorage.getItem(`treeLang:${id}`);
      if (cfg) {
        const parsed = JSON.parse(cfg);
        if (parsed.primary) primary = parsed.primary;
        if (parsed.secondary) secondary = parsed.secondary;
      }
    }
  } catch (_) {}
  const primaryName = primary === 'ar' ? (person.arabicName || person.name) : (person.name || person.arabicName);
  const secondaryName = secondary === 'ar' ? person.arabicName : person.name;

  // Soft pastel fills (blue / english lavender / maroon) so black names stay crisp
  const genderKey = String(person?.gender || '').toUpperCase();
  const tintClass =
    genderKey === 'MALE' || genderKey === 'M'
      ? 'tree-node-tint-blue'
      : genderKey === 'FEMALE' || genderKey === 'F'
        ? 'tree-node-tint-lavender'
        : 'tree-node-tint-maroon';

  let nodeClasses = `tree-node group ${tintClass} border-2 rounded-xl shadow-lg cursor-pointer transition-all duration-300 relative`;

  if (isRoot) {
    nodeClasses += " tree-node-root border-amber-400";
  } else if (isLineageConnection) {
    nodeClasses += " border-pink-300";
  } else if (isFocused) {
    nodeClasses += " border-slate-400 shadow-md";
  } else if (isInLineage) {
    nodeClasses += " border-slate-300 shadow-sm";
  } else {
    nodeClasses += " hover:shadow-md hover:brightness-[1.01]";
  }
  if (isCollapsed) {
    nodeClasses += " tree-node-collapsed";
  }
  if (enterDelay != null) {
    nodeClasses += " tree-node-entering";
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasChildren && onToggleCollapse) {
      onToggleCollapse(person.id);
    }
  };

  return (
    <div
      className={nodeClasses}
      onClick={() => onPersonClick(person.id)}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={enterDelay != null ? { '--tree-enter-delay': `${enterDelay}ms` } : undefined}
      title={hasChildren ? (isCollapsed ? 'Double-click to expand descendants' : 'Double-click to collapse descendants') : undefined}
    >
      {/* Incoming connections. Children laid out in a row connect at the top;
          children stacked in a column connect on the left, so their edge runs
          down the parent's spine and turns in rather than cutting across the
          siblings above them. */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{ background: '#D1D5DB', width: 6, height: 6 }}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ background: '#D1D5DB', width: 6, height: 6 }}
      />

      {/* Add Parent — floats above the card (outside overflow clip) */}
      {isRoot && showActionButtons && !readOnly && onAddParent && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddParent(person); }}
          className="add-parent-button"
          title={addParentTitle}
          aria-label={addParentTitle}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m-8 8l8-8 8 8" />
          </svg>
        </button>
      )}

      <div className="tree-node-body text-center relative">
        <div className="tree-node-name font-bold text-gray-900 dark:text-white mb-1">
          {primary === 'ar' ? (
            <div className="arabic-text text-gray-900 dark:text-white">{primaryName}</div>
          ) : (
            <>
              {primaryName}
            </>
          )}
          {person.noHeir && (
            <span
              className="tree-node-badge ms-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full"
              title="No heir"
            >
              ⊘
            </span>
          )}
          {secondaryName && ((primary === 'ar' && person.name) || (primary !== 'ar' && person.arabicName)) && (
            <div className={`tree-node-secondary ${secondary === 'ar' ? 'arabic-text' : ''} text-sm text-gray-600 dark:text-gray-400`}>{secondaryName}</div>
          )}
        </div>
        
        {/* Spouse name is now shown as separate node, so remove text display */}
        
        {person.title && (
          <div className="tree-node-meta text-sm text-primary-600 dark:text-primary-400 font-medium mb-2">{person.title}</div>
        )}
        <div className="tree-node-meta text-xs text-gray-500 dark:text-gray-400 space-x-2">
          {person.birthYear && <span>b. {person.birthYear}</span>}
          {person.deathYear && <span>d. {person.deathYear}</span>}
        </div>
        
        {/* Show lineage connection indicator */}
        {isLineageConnection && (
          <div className="text-xs text-pink-600 dark:text-pink-400 mt-2 font-medium">
            Wife's Father
          </div>
        )}

        {/* Cross-tree link indicator for this person */}
        {getCrossTreeLinks && (() => {
          const links = getCrossTreeLinks(String(person.id));
          if (!links.length) return null;
          return (
            <div
              onClick={(e) => { e.stopPropagation(); onCrossTreeNavigate?.(links[0].navUrl); }}
              className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 cursor-pointer"
              title={`View in ${links[0].otherTreeName}`}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="truncate max-w-[110px]">{links[0].otherTreeName}</span>
              {links.length > 1 && <span className="text-violet-400 dark:text-violet-500">+{links.length - 1}</span>}
            </div>
          );
        })()}

        {/* Inline spouse display */}
        {spouseInline && (
          <div className="tree-node-spouse mt-2 pt-2 border-t border-gray-200/80">
            <div className="text-[10px] text-rose-400 uppercase tracking-wide mb-0.5">Spouse</div>
            <div className="flex items-center justify-center gap-1">
              <div className="text-sm text-slate-700 font-medium leading-tight">
                {primary === 'ar'
                  ? (spouseInline.arabicName || spouseInline.name)
                  : (spouseInline.name || spouseInline.arabicName)}
              </div>
              {spouseInline.isInTree && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateToNode) onNavigateToNode(spouseInline.id);
                    else onPersonClick(spouseInline.id);
                  }}
                  className="flex-shrink-0 p-0.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Go to spouse's node"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
              {spouseInline.isCrossTree && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCrossTreeNavigate?.(
                      `/trees/${spouseInline.treeId}?focus=${encodeURIComponent(spouseInline.id)}`
                    );
                  }}
                  className="flex-shrink-0 p-0.5 rounded text-violet-500 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                  title={spouseInline.treeName || 'Other tree'}
                  aria-label={`View spouse in ${spouseInline.treeName || 'other tree'}`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
            </div>
            {((primary === 'ar' && spouseInline.name) || (primary !== 'ar' && spouseInline.arabicName)) && (
              <div className={`${secondary === 'ar' ? 'arabic-text' : ''} text-xs text-slate-500`}>
                {primary === 'ar' ? spouseInline.name : spouseInline.arabicName}
              </div>
            )}
            {/* Further spouses, for trees that allow more than one. Only the
                first is drawn with links; the rest are listed so the node still
                says who else this person is married to. */}
            {(() => {
              const others = (person.spouseNames || []).filter((n) => n && n !== spouseInline.name);
              return others.length > 0 ? (
                <div className="text-xs text-slate-500 mt-0.5">{others.join(', ')}</div>
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* Floating action cluster — outside body so it is not clipped */}
      {(showViewButton || showEditButton || showDeleteButton) && (
        <div className="tree-node-actions">
          {showViewButton && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewPerson(person); }}
              className="tree-node-action"
              title={viewTitle}
              aria-label={viewTitle}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {showEditButton && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditPerson(person); }}
              className={`tree-node-action ${isRoot ? 'edit-person-button' : ''}`}
              title={editTitle}
              aria-label={editTitle}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {showDeleteButton && !isRoot && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDeletePerson(person); }}
              className="tree-node-action hover:!bg-rose-600 hover:!text-white hover:!ring-rose-600"
              title={deleteTitle}
              aria-label={deleteTitle}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {person.generation != null && (
        <div className="absolute top-2 start-2 z-20 bg-slate-800/90 text-white text-[10px] leading-none px-2 py-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {person.generation}
        </div>
      )}

      {/* Add family member (+) — spouse is chosen inside the modal */}
      {showAddDescendantButton && !readOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddDescendant(person);
          }}
          className={`add-descendant-button ${isRoot ? 'root-add-descendant-button' : ''}`}
          title={addMemberTitle}
          aria-label={addMemberTitle}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Collapsed-branch badge — shows how many descendants are hidden */}
      {isCollapsed && collapsedDescendantCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.(person.id);
          }}
          className="absolute -bottom-3 start-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary-700 text-white text-[10px] font-semibold shadow-md hover:bg-primary-800 transition-colors"
          title={`Expand ${collapsedDescendantCount} descendant${collapsedDescendantCount === 1 ? '' : 's'}`}
        >
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {collapsedDescendantCount}
        </button>
      )}

      {/* Bottom output handle for outgoing connections */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: '#D1D5DB', width: 6, height: 6 }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization - only re-render when these change
  const prevData = prevProps.data;
  const nextData = nextProps.data;
  return (
    prevData.person.id === nextData.person.id &&
    prevData.person.name === nextData.person.name &&
    prevData.person.arabicName === nextData.person.arabicName &&
    prevData.person.birthYear === nextData.person.birthYear &&
    prevData.person.deathYear === nextData.person.deathYear &&
    prevData.person.title === nextData.person.title &&
    prevData.person.spouseName === nextData.person.spouseName &&
    (prevData.person.spouseNames || []).join('|') === (nextData.person.spouseNames || []).join('|') &&
    prevData.person.isLiving === nextData.person.isLiving &&
    prevData.person.noHeir === nextData.person.noHeir &&
    prevData.spouseInline?.name === nextData.spouseInline?.name &&
    prevData.spouseInline?.arabicName === nextData.spouseInline?.arabicName &&
    prevData.spouseInline?.isInTree === nextData.spouseInline?.isInTree &&
    prevData.spouseInline?.isCrossTree === nextData.spouseInline?.isCrossTree &&
    prevData.spouseInline?.treeId === nextData.spouseInline?.treeId &&
    prevData.spouseInline?.treeName === nextData.spouseInline?.treeName &&
    prevData.isFocused === nextData.isFocused &&
    prevData.isInLineage === nextData.isInLineage &&
    prevData.isRoot === nextData.isRoot &&
    prevData.readOnly === nextData.readOnly &&
    !!prevData.onViewPerson === !!nextData.onViewPerson &&
    prevData.isCollapsed === nextData.isCollapsed &&
    prevData.collapsedDescendantCount === nextData.collapsedDescendantCount &&
    prevData.hasChildren === nextData.hasChildren &&
    prevData.enterDelay === nextData.enterDelay &&
    prevData.crossTreeLinkCount === nextData.crossTreeLinkCount
  );
});

// Node types
const nodeTypes = {
  familyNode: FamilyNode,
};

// Orthogonal L-path for stacked (HORIZONTAL) children: drop along the parent's
// x (the layout spine), then turn horizontally into the child's left handle.
// Avoids bezier arcs cutting through middle siblings' descendant subtrees.
const FamilySpineEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd }) => {
  const path = `M ${sourceX},${sourceY} L ${sourceX},${targetY} L ${targetX},${targetY}`;
  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
};

const edgeTypes = {
  familySpine: FamilySpineEdge,
};

// Parent → child connector.
// VERTICAL (children in a row): cubic bezier — reads clean under a parent.
// HORIZONTAL (children stacked in a column): boxy spine edge (see FamilySpineEdge).
// Lineage links (wife's father) render pink and dashed.
const buildChildEdge = (parentPerson, childPerson, orientation) => {
  const isLineageEdge = childPerson.notes === 'LINEAGE_CONNECTION';
  const color = isLineageEdge ? '#DB2777' : '#6B7280';
  const isStacked = orientation === 'HORIZONTAL';
  return {
    id: `${parentPerson.id}-${childPerson.id}`,
    source: parentPerson.id.toString(),
    target: childPerson.id.toString(),
    targetHandle: isStacked ? 'left' : 'top',
    type: isStacked ? 'familySpine' : 'default',
    animated: false,
    ...(isStacked ? {} : { pathOptions: { curvature: 0.35 } }),
    style: {
      stroke: color,
      strokeWidth: isLineageEdge ? 2.5 : 2,
      strokeDasharray: isLineageEdge ? '6,4' : 'none',
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color,
      width: 14,
      height: 14,
    },
  };
};

// Collect all primary person IDs (root + descendants only, NOT spouses)
const collectPrimaryIds = (node, ids = new Set()) => {
  const person = node.person || node;
  if (person?.id) ids.add(String(person.id));
  (node.children || []).forEach(child => collectPrimaryIds(child, ids));
  return ids;
};


const collectPeopleFromTree = (node, out = [], seen = new Set()) => {
  if (!node) return out;
  const person = node.person || node;
  if (person?.id && !seen.has(String(person.id))) {
    seen.add(String(person.id));
    out.push(person);
  }
  const spouse = node.spouse;
  if (spouse?.id && !seen.has(String(spouse.id))) {
    seen.add(String(spouse.id));
    out.push(spouse);
  }
  (node.children || []).forEach((child) => collectPeopleFromTree(child, out, seen));
  return out;
};

const ReactFlowTreeViewer = ({ onPersonClick, onAddDescendant, onAddParent, onViewPerson: externalOnViewPerson, onEditPerson: externalOnEditPerson, onDeletePerson: externalOnDeletePerson, refreshTrigger = 0, focusedPersonId, readOnly = false, initialTreeData = null, layoutMode = 'VERTICAL', crossTreeLinksMap, actionLabels }) => {
  const [treeData, setTreeData] = useState(initialTreeData);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // Keep a ref that always mirrors the latest nodes array without causing stale closures
  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const [loading, setLoading] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [focusedLineage, setFocusedLineage] = useState(new Set());
  const [, setShowEditModal] = useState(false);
  const [, setSelectedPerson] = useState(null);
  const [dynamicMinZoom, setDynamicMinZoom] = useState(0.01);
  const [densityClass, setDensityClass] = useState('tree-density-full');
  /** Person IDs whose entire descendant branch is collapsed. */
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  /** Progressive expand: { rootId, depth, maxDepth } — deepen one generation at a time. */
  const [expanding, setExpanding] = useState(null);
  const { fitView, setCenter, zoomIn, zoomOut, zoomTo, getZoom } = useReactFlow();
  // Ref on the outermost wrapper div — toggling rf-panning disables the CSS zoom transition
  // during drag-panning (avoids elastic-lag), without causing any React re-renders.
  const rfContainerRef = useRef(null);
  const handlePanStart = useCallback(() => {
    rfContainerRef.current?.classList.add('rf-panning');
  }, []);
  const handlePanEnd = useCallback(() => {
    rfContainerRef.current?.classList.remove('rf-panning');
  }, []);
  const applyLabelZoom = useCallback((zoom) => {
    const z = zoom ?? 1;
    // Inverse label scale: zoom out → larger names; zoom in → smaller names
    rfContainerRef.current?.style.setProperty('--tree-label-scale', String(labelScaleForZoom(z)));
    let next = 'tree-density-full';
    if (z < 0.35) next = 'tree-density-compact';
    else if (z < 0.65) next = 'tree-density-medium';
    setDensityClass((prev) => (prev === next ? prev : next));
  }, []);
  const handleViewportChange = useCallback((_evt, viewport) => {
    applyLabelZoom(viewport?.zoom);
  }, [applyLabelZoom]);

  // Sync inverse label scale after fitView / initial layout
  useEffect(() => {
    if (!nodes.length) return undefined;
    const id = requestAnimationFrame(() => {
      try { applyLabelZoom(getZoom()); } catch (_) { applyLabelZoom(1); }
    });
    return () => cancelAnimationFrame(id);
  }, [nodes.length, applyLabelZoom, getZoom]);
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  // Undo delete state
  const [deletedPersonBackup, setDeletedPersonBackup] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);
  // const [draggedNode, setDraggedNode] = useState(null);
  // const [dragOverNode, setDragOverNode] = useState(null);
  const isMobile = useMediaQuery('(max-width:768px)');

  // View person details (read-only popup)
  const handleViewPerson = useCallback((person) => {
    if (externalOnViewPerson) {
      try {
        externalOnViewPerson(person);
        return;
      } catch (e) {
        console.error('External onViewPerson failed:', e);
      }
    }
  }, [externalOnViewPerson]);

  const findTreeNode = useCallback((node, targetId) => {
    if (!node) return null;
    const person = node.person || node;
    if (person?.id != null && String(person.id) === String(targetId)) return node;
    for (const child of node.children || []) {
      const found = findTreeNode(child, targetId);
      if (found) return found;
    }
    return null;
  }, []);

  const handleToggleCollapse = useCallback((personId) => {
    const id = String(personId);
    const treeNode = findTreeNode(treeData, id);
    const childCount = treeNode?.children?.length || 0;
    if (!treeNode || childCount === 0) return;

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Expand: remove collapse and progressively reveal generations
        next.delete(id);
        const maxDepth = maxSubtreeDepth(treeNode);
        setExpanding({ rootId: id, depth: 1, maxDepth: Math.max(1, maxDepth) });
      } else {
        // Collapse entire branch instantly
        next.add(id);
        setExpanding((exp) => (exp && String(exp.rootId) === id ? null : exp));
      }
      return next;
    });
  }, [treeData, findTreeNode]);

  // Deepen progressive expand one generation at a time
  useEffect(() => {
    if (!expanding) return undefined;
    if (expanding.depth >= expanding.maxDepth) {
      const done = setTimeout(() => setExpanding(null), 450);
      return () => clearTimeout(done);
    }
    const step = setTimeout(() => {
      setExpanding((exp) => {
        if (!exp) return null;
        if (exp.depth >= exp.maxDepth) return exp;
        return { ...exp, depth: exp.depth + 1 };
      });
    }, 130);
    return () => clearTimeout(step);
  }, [expanding]);

  // Edit person handler (wrap external handler if provided)
  const handleEditPerson = useCallback((person) => {
    if (externalOnEditPerson) {
      try {
        externalOnEditPerson(person.id);
        return;
      } catch (e) {
        console.error('External onEditPerson failed:', e);
      }
    }
    // Fallback: set local state if you later render a modal inside this component
    setSelectedPerson(person);
    setShowEditModal(true);
  }, [externalOnEditPerson]);

  // Stable navigate-to-person: reads nodesRef so it never captures stale node positions
  const navigateToPerson = useCallback((personId) => {
    const node = nodesRef.current.find(n => n.id === String(personId));
    if (node) {
      // +125 / +80 ≈ half the node width / height so the viewport centres on the node
      setCenter(node.position.x + 125, node.position.y + 80, { zoom: 1.2, duration: 800 });
    }
    onPersonClick(personId);
  }, [setCenter, onPersonClick]);

  // Cross-tree navigation: open the other tree in a new tab
  const handleCrossTreeNavigate = useCallback((navUrl) => {
    window.open(navUrl, '_blank', 'noopener,noreferrer');
  }, []);

  // Look up cross-tree links for a person from the map passed by TreeViewPage
  const getCrossTreeLinks = useCallback((personId) => {
    return crossTreeLinksMap?.get(String(personId)) || [];
  }, [crossTreeLinksMap]);


  // Load entire root tree from backend
  const loadRootTree = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      setSearchResults([]);
      const response = await treeAPI.getTree(forceRefresh);
      setTreeData(response.data);
      setHasAttemptedLoad(true);
    } catch (error) {
      setError('Failed to load family tree');
      console.error('Error loading tree:', error);
      setHasAttemptedLoad(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete person handler: use external if provided, else perform immediate delete with confirm
  const handleDeletePerson = useCallback(async (person) => {
    if (externalOnDeletePerson) {
      try {
        await externalOnDeletePerson(person);
        return;
      } catch (e) {
        console.error('External onDeletePerson failed:', e);
        // fall through to internal delete if external fails
      }
    }
    if (!person?.id) return;
    
    // Show custom delete confirmation dialog
    setPersonToDelete(person);
    setDeleteDialogOpen(true);
  }, [externalOnDeletePerson]);

  // Helper to find parent ID of a person in the tree
  const findParentId = useCallback((node, targetId, parentId = null) => {
    if (!node) return null;
    
    const currentId = node.person?.id || node.id;
    if (currentId === targetId) {
      return parentId;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = findParentId(child, targetId, currentId);
        if (found !== null) return found;
      }
    }
    
    return null;
  }, []);

  // Handle delete confirmation with undo support
  const handleDeleteConfirm = useCallback(async () => {
    if (!personToDelete?.id) return;
    
    try {
      // Find and store the parent ID before deletion
      const parentId = findParentId(treeData, personToDelete.id);
      
      // Backup the person data before deletion for potential undo
      const backupData = { 
        ...personToDelete,
        parentId: parentId // Store the parent relationship
      };
      
      await treeAPI.deletePerson(personToDelete.id);
      
      // Store backup for undo
      setDeletedPersonBackup(backupData);
      setShowUndoToast(true);
      
      // Clear any existing undo timeout
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
      
      // Set timeout to clear undo option after 10 seconds
      const timeoutId = setTimeout(() => {
        setShowUndoToast(false);
        setDeletedPersonBackup(null);
      }, 10000);
      setUndoTimeoutId(timeoutId);
      
      // Update tree data by removing the deleted person instead of full reload
      setTreeData(prevData => {
        if (!prevData) return prevData;
        const removePersonRecursive = (node) => {
          if (!node) return null;
          if (node.id === personToDelete.id) return null;
          return {
            ...node,
            children: node.children?.map(removePersonRecursive).filter(Boolean) || []
          };
        };
        return removePersonRecursive(prevData);
      });
      
      setDeleteDialogOpen(false);
      setPersonToDelete(null);
    } catch (error) {
      console.error('Error deleting person:', error);
      alert('Failed to delete person. Please try again.');
    }
  }, [personToDelete, undoTimeoutId, findParentId, treeData]);

  // Handle undo delete
  const handleUndoDelete = useCallback(async () => {
    if (!deletedPersonBackup) return;
    
    try {
      // Re-create the person with the backed up data, including the parent relationship
      const restoreData = {
        name: deletedPersonBackup.name,
        arabicName: deletedPersonBackup.arabicName,
        gender: deletedPersonBackup.gender,
        birthYear: deletedPersonBackup.birthYear,
        deathYear: deletedPersonBackup.deathYear,
        title: deletedPersonBackup.title,
        description: deletedPersonBackup.description,
        parentId: deletedPersonBackup.parentId, // Use the stored parent ID
      };
      
      await treeAPI.addPerson(restoreData);
      
      // Clear undo state
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
      setShowUndoToast(false);
      setDeletedPersonBackup(null);
      setUndoTimeoutId(null);
      
      // Wait a bit for backend to process, then force full tree reload
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadRootTree(true); // Force refresh to get complete tree
    } catch (error) {
      console.error('Error restoring person:', error);
      alert('Failed to restore person. The undo operation could not be completed.');
    }
  }, [deletedPersonBackup, loadRootTree, undoTimeoutId]);

  // Cleanup undo timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
    };
  }, [undoTimeoutId]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setPersonToDelete(null);
  }, []);

  // Legacy modal handlers removed (unused)

  // Helper function to get all node IDs
  const getAllNodeIds = useCallback((node) => {
    if (!node) return [];
    const ids = [node.person?.id || node.id];
    
    // No longer add spouse IDs as separate nodes
    // Spouse information is now embedded in the person's node and spouses are not visually connected
    
    if (node.children) {
      node.children.forEach(child => {
        ids.push(...getAllNodeIds(child));
      });
    }
    return ids.filter(id => id);
  }, []);

  // Helper function to count descendants of a person
  const countDescendants = useCallback((node, targetId) => {
    if (!node) return 0;
    
    const currentId = node.person?.id || node.id;
    if (currentId === targetId) {
      // Count all descendants (excluding the person themselves)
      return getAllNodeIds(node).length - 1;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const count = countDescendants(child, targetId);
        if (count >= 0) return count;
      }
    }
    
    return -1; // Not found
  }, [getAllNodeIds]);

  // Find person lineage (ancestors + descendants)
  const findPersonLineage = useCallback((node, targetId, path = []) => {
    if (!node) return [];
    
    const currentId = node.person?.id || node.id;
    const currentPath = [...path, currentId];
    
    if (currentId === targetId) {
      // Found the target person - get all ancestors (path), descendants
      const ancestors = [...currentPath];
      const descendants = getAllNodeIds(node);
      const lineage = [...new Set([...ancestors, ...descendants])];
      
      // No longer add spouse to lineage as separate node
      // Spouse information is embedded in the person's node and spouses are not visually connected
      
      return lineage;
    }
    
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

  // Convert tree structure to React Flow nodes and edges

  // Positions come from measureSubtree, which reserves exactly the space each
  // subtree occupies under the active layout mode (honouring collapse / expand).
  const convertTreeToFlow = useCallback((node, focusedId, lineage, x = 0, y = 0, level = 0, processedNodes = new Set(), primaryIds = new Set(), measureCache = new Map(), depthFromExpandRoot = null, siblingIndex = 0) => {
    const nodes = [];
    const edges = [];
    const person = node.person || node;
    const spouse = node.spouse; // Include spouse as separate node

    // Skip if already processed
    if (processedNodes.has(person.id)) {
      return { nodes: [], edges: [] };
    }
    processedNodes.add(person.id);

    // Check if this is a lineage connection (wife's father)
    const isLineageConnection = person.notes === "LINEAGE_CONNECTION";

    // Create node
    const isRoot = level === 0;
    const isFocused = person.id === focusedId;
    const isInLineage = lineage.has(person.id);

    // Validate person ID
    if (!person.id) {
      console.warn('Person missing ID:', person);
      return { nodes: [], edges: [] };
    }

    const personIdStr = String(person.id);
    let expandDepth = depthFromExpandRoot;
    if (expanding && personIdStr === String(expanding.rootId)) {
      expandDepth = 0;
    }
    const rawChildCount = (node.children || []).length;
    const hasChildren = rawChildCount > 0;
    const isCollapsed = collapsedIds.has(personIdStr);
    const collapsedDescendantCount = isCollapsed ? countSubtreeSize(node) : 0;
    // Only the generation just revealed animates in (avoids re-flashing parents).
    // Slight per-sibling stagger keeps large sibling groups from popping in as a block.
    const isNewlyRevealed =
      !!expanding && expandDepth != null && expandDepth > 0 && expandDepth === expanding.depth;
    const enterDelay = isNewlyRevealed ? siblingIndex * 40 : null;

    // Spouses are always shown inline — redirect only when useful:
    //   isInTree     → spouse has their own node in this tree (jump within tree)
    //   isCrossTree  → spouse lives in another tree (open that tree)
    // Newly created same-tree spouses get name only (no arrow).
    const currentTreeId = person.treeId
      ?? (typeof window !== 'undefined' ? window.NASAB_CURRENT_TREE_ID : null);
    const spouseTreeId = spouse?.treeId ?? null;
    const isCrossTree = !!(
      spouse?.id &&
      spouseTreeId != null &&
      currentTreeId != null &&
      String(spouseTreeId) !== String(currentTreeId)
    );
    const spouseInline = spouse && spouse.id
      ? {
          id: spouse.id,
          name: spouse.name,
          arabicName: spouse.arabicName,
          isInTree: primaryIds.has(String(spouse.id)),
          isCrossTree,
          treeId: spouseTreeId,
          treeName: spouse.treeName ?? null,
        }
      : null;

    // Person-identity cross-tree links only (not spouses — those use isCrossTree)
    const personCrossLinks = getCrossTreeLinks(String(person.id)).length;
    const spouseCrossLinks = spouseInline?.isCrossTree ? 1 : 0;

    nodes.push({
      id: person.id.toString(),
      type: 'familyNode',
      position: { x, y },
      data: {
        person,
        spouseInline,
        onPersonClick,
        onAddDescendant,
        onAddParent,
        onViewPerson: externalOnViewPerson ? handleViewPerson : undefined,
        onEditPerson: handleEditPerson,
        onDeletePerson: handleDeletePerson,
        onNavigateToNode: navigateToPerson,
        onToggleCollapse: handleToggleCollapse,
        readOnly,
        isRoot,
        isFocused,
        isInLineage,
        isLineageConnection,
        isCollapsed,
        collapsedDescendantCount,
        hasChildren,
        enterDelay,
        getCrossTreeLinks,
        onCrossTreeNavigate: handleCrossTreeNavigate,
        crossTreeLinkCount: personCrossLinks + spouseCrossLinks,
        actionLabels,
      },
      draggable: false,
      selectable: true,
    });

    // Children sit at offsets already reserved for them by measureSubtree.
    const visibilityOpts = { collapsedIds, expanding };
    const measure = measureSubtree(node, level, layoutMode, measureCache, visibilityOpts, expandDepth);
    const childExpandDepth = expandDepth == null ? null : expandDepth + 1;
    measure.children.forEach((child, index) => {
      const childPerson = child.person || child;
      if (!childPerson.id) return;
      const { dx, dy } = measure.placements[index];

      if (person.id) {
        const edge = buildChildEdge(person, childPerson, measure.orientation);
        const childIsNew =
          !!expanding && childExpandDepth != null && childExpandDepth === expanding.depth;
        if (childIsNew) {
          edge.className = 'tree-edge-entering';
          edge.style = {
            ...edge.style,
            animationDelay: `${index * 40}ms`,
          };
        }
        edges.push(edge);
      }

      const childResult = convertTreeToFlow(
        child, focusedId, lineage, x + dx, y + dy, level + 1, processedNodes, primaryIds, measureCache, childExpandDepth, index,
      );
      nodes.push(...childResult.nodes);
      edges.push(...childResult.edges);
    });

    return { nodes, edges };
  }, [onPersonClick, onAddDescendant, onAddParent, externalOnViewPerson, handleViewPerson, handleEditPerson, handleDeletePerson, handleToggleCollapse, navigateToPerson, readOnly, layoutMode, getCrossTreeLinks, handleCrossTreeNavigate, actionLabels, collapsedIds, expanding]);


  

  // Seamless add person function
  const addPersonToTree = useCallback((newPerson, parentId, relationshipType = 'descendant') => {
    setTreeData(prevTree => {
      if (!prevTree) return prevTree;

      // Pre-pass: for spouse relationships, find the parent person's data so we can
      // apply the reciprocal (bidirectional) update to the spouse's own node.
      let parentPersonData = null;
      if (relationshipType === 'spouse') {
        const findParentPerson = (node) => {
          if (node.person && String(node.person.id) === String(parentId)) return node.person;
          for (const child of (node.children || [])) {
            const found = findParentPerson(child);
            if (found) return found;
          }
          return null;
        };
        parentPersonData = findParentPerson(prevTree);
      }

      const addPersonToNode = (node) => {
        if (node.person && String(node.person.id) === String(parentId)) {
          if (relationshipType === 'spouse') {
            // For spouses, update the parent node's spouse field immediately
            // so the inline spouse name appears without waiting for a full reload
            return { ...node, spouse: newPerson };
          } else {
            // For descendants, add as a child
            const newChild = {
              person: newPerson,
              children: []
            };
            
            // Add the new child and sort all children by orderIndex, then birth year (elder to younger)
            const updatedChildren = [...(node.children || []), newChild].sort((a, b) => {
              const personA = a.person || a;
              const personB = b.person || b;
              
              // Primary sort: orderIndex (ascending)
              const orderA = personA.orderIndex != null ? personA.orderIndex : 0;
              const orderB = personB.orderIndex != null ? personB.orderIndex : 0;
              if (orderA !== orderB) {
                return orderA - orderB;
              }
              
              // Secondary sort: birth year (ascending - elder first)
              if (personA.birthYear !== null && personA.birthYear !== undefined && 
                  personB.birthYear !== null && personB.birthYear !== undefined) {
                return personA.birthYear - personB.birthYear;
              }
              
              // Tertiary sort: if one has birth year and other doesn't, prioritize the one with birth year
              if (personA.birthYear !== null && personA.birthYear !== undefined) return -1;
              if (personB.birthYear !== null && personB.birthYear !== undefined) return 1;
              
              // Quaternary sort: by ID for consistent ordering
              return personA.id.localeCompare(personB.id);
            });
            
            return {
              ...node,
              children: updatedChildren
            };
          }
        }
        
        // Bidirectional spouse update: if the new spouse already exists as a tree
        // member, update that node's spouse field to point back to the parent person.
        // (Only applies when the spouse's own node is already in the tree.)
        if (
          relationshipType === 'spouse' &&
          parentPersonData &&
          node.person &&
          String(node.person.id) === String(newPerson.id)
        ) {
          return { ...node, spouse: parentPersonData };
        }

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
  }, []);

  // Expose the function globally for seamless updates
  useEffect(() => {
    window.addPersonToTree = (newPerson, parentId, relationshipType = 'descendant') => {
      addPersonToTree(newPerson, parentId, relationshipType);
    };
    return () => {
      delete window.addPersonToTree;
    };
  }, [addPersonToTree]);

  // Load tree data
  useEffect(() => {
    if (initialTreeData) {
      setTreeData(initialTreeData);
      setLoading(false);
      return;
    }
    loadRootTree();
  }, [refreshTrigger, loadRootTree, initialTreeData]);

  // Convert tree data to React Flow format (also when collapse / expand depth changes)
  useEffect(() => {
    if (treeData) {
      const primaryIds = collectPrimaryIds(treeData);
      const { nodes: flowNodes, edges: flowEdges } = convertTreeToFlow(treeData, focusedPersonId, focusedLineage, 500, 100, 0, new Set(), primaryIds);
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [treeData, focusedPersonId, focusedLineage, collapsedIds, expanding, setNodes, setEdges, convertTreeToFlow]);

  // Compute minimum zoom so the user can't zoom out further than the tree's own bounding box
  // (with ~15% padding). Guard refs ensure this only recalculates when treeData/layoutMode
  // actually change, not on every focusedLineage re-render.
  const prevTreeDataRef = useRef(null);
  const prevLayoutModeRef = useRef(null);
  useEffect(() => {
    if (nodes.length === 0) return;
    if (treeData === prevTreeDataRef.current && layoutMode === prevLayoutModeRef.current) return;
    prevTreeDataRef.current = treeData;
    prevLayoutModeRef.current = layoutMode;

    const container = rfContainerRef.current;
    if (!container) return;

    const xs = nodes.flatMap(n => [n.position.x, n.position.x + (n.width  ?? 250)]);
    const ys = nodes.flatMap(n => [n.position.y, n.position.y + (n.height ?? 160)]);
    const treeW = Math.max(...xs) - Math.min(...xs);
    const treeH = Math.max(...ys) - Math.min(...ys);
    if (treeW === 0 || treeH === 0) return;

    const containerW = container.offsetWidth;
    const containerH = container.offsetHeight;

    const zoomFitX = containerW / (treeW * 1.15);
    const zoomFitY = containerH / (treeH * 1.15);
    const newMin = Math.max(0.005, Math.min(zoomFitX, zoomFitY, 0.5));
    setDynamicMinZoom(newMin);
  }, [nodes, treeData, layoutMode]);

  // Center the view after nodes are loaded (only if no focused person)
  useEffect(() => {
    if (nodes.length > 0 && !focusedPersonId) {
      // Small delay to ensure ReactFlow has rendered the nodes
      const timer = setTimeout(() => {
        try {
          fitView({ padding: 0.2, includeHiddenNodes: false, duration: 300 });
        } catch (e) {
          // Ignore fitView errors during component updates
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView, focusedPersonId]);

  // Handle focused person changes
  useEffect(() => {
    if (focusedPersonId && treeData) {
      const lineage = findPersonLineage(treeData, focusedPersonId);
      setFocusedLineage(new Set(lineage));
    } else {
      setFocusedLineage(new Set());
    }
  }, [focusedPersonId, treeData, findPersonLineage]);

  // Auto-scroll to the focused person whenever focusedPersonId changes or nodes are first populated.
  // Uses a ref to track which person we last scrolled to, preventing repeated scrolls.
  //
  // Key design decisions:
  // 1. `lastScrolledPersonId` is set INSIDE the timer callback (not before it) so that
  //    rapid `setNodes` calls (e.g. from the focusedLineage re-render) keep debouncing
  //    the timer rather than being blocked by the guard too early.
  // 2. `nodesRef.current` is used inside the callback to get the latest node positions
  //    at the time the timer fires — avoiding stale closure over the `nodes` snapshot.
  // 3. The effect cleanup cancels any pending timer to avoid post-unmount calls.
  const lastScrolledPersonId = useRef(null);
  const scrollTimerRef = useRef(null);
  useEffect(() => {
    if (!focusedPersonId || nodes.length === 0) return;
    // Guard: skip if we already centred on this person (set inside timer callback below)
    if (lastScrolledPersonId.current === String(focusedPersonId)) return;
    // Confirm the node exists in this render's snapshot before scheduling
    const nodeExists = nodes.some(n => n.id === String(focusedPersonId));
    if (!nodeExists) return;
    // Cancel any in-flight timer so rapid nodes-changes always restart the debounce
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
      // Use nodesRef.current for the LATEST positions (handles focusedLineage re-renders
      // that fire setNodes between the effect and this callback)
      const latestNode = nodesRef.current.find(n => n.id === String(focusedPersonId));
      if (!latestNode) return;
      // Mark as scrolled here so any subsequent nodes-change for this person is ignored
      lastScrolledPersonId.current = String(focusedPersonId);
      try {
        // +125 / +80 ≈ half the node width / height so we centre on the node
        setCenter(latestNode.position.x + 125, latestNode.position.y + 80, { zoom: 1.2, duration: 800 });
      } catch (_) {}
    }, 500);
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [focusedPersonId, nodes, setCenter]);

  // Track zoom level using ReactFlow's onMoveEnd instead of polling
  // const handleMoveEnd = useCallback((event, viewport) => {
  //   setZoom(viewport.zoom);
  // }, []);

  // Search functionality
  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    const q = term.toLowerCase();
    const local = collectPeopleFromTree(treeData).filter((p) =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.arabicName && p.arabicName.toLowerCase().includes(q))
    );
    if (local.length > 0 || readOnly) {
      setSearchResults(local);
      return;
    }

    try {
      const response = await smartSearchPersons(term);
      setSearchResults(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const jumpToPerson = (personId) => {
    const id = personId != null ? String(personId) : '';
    const node = nodes.find((n) =>
      n.id === id || String(n.data?.person?.id) === id || String(n.data?.spouseInline?.id) === id
    );
    if (node) {
      setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 1000 });
      onPersonClick(node.data?.person?.id || personId);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Drag and drop handlers for reordering siblings - DISABLED
  // const handleNodeDragStart = useCallback((event, node) => {
  //   if (readOnly || node.data.isRoot) return; // Don't allow dragging root nodes
  //   setDraggedNode(node);
  // }, [readOnly]);

  // const handleNodeDrag = useCallback((event, node) => {
  //   if (readOnly || !draggedNode) return;

  //   // Simple approach: check if we're hovering over any other node
  //   const draggedBounds = {
  //     x: node.position.x,
  //     y: node.position.y,
  //     width: 200, // Approximate node width
  //     height: 120 // Approximate node height
  //   };

  //   let foundTarget = null;
  //   for (const otherNode of nodes) {
  //     if (otherNode.id === draggedNode.id || otherNode.data.isRoot) continue; // Skip self and root

  //     const otherBounds = {
  //       x: otherNode.position.x,
  //       y: otherNode.position.y,
  //       width: 200,
  //       height: 120
  //     };

  //     // Check if dragged node overlaps with this node
  //     if (draggedBounds.x < otherBounds.x + otherBounds.width &&
  //         draggedBounds.x + draggedBounds.width > otherBounds.x &&
  //         draggedBounds.y < otherBounds.y + otherBounds.height &&
  //         draggedBounds.y + draggedBounds.height > otherBounds.y) {
  //       foundTarget = otherNode;
  //       break;
  //     }
  //   }

  //   setDragOverNode(foundTarget);
  // }, [draggedNode, nodes, readOnly]);

  // const handleNodeDragStop = useCallback(async (event, node) => {
  //   if (readOnly || !draggedNode || !dragOverNode) {
  //     setDraggedNode(null);
  //     setDragOverNode(null);
  //     return;
  //   }

  //   try {
  //     const draggedPerson = draggedNode.data.person;
  //     const targetPerson = dragOverNode.data.person;

  //     // Only allow reordering if both are not root nodes (backend will validate siblings)
  //     if (draggedPerson.generation > 1 && targetPerson.generation > 1) {
  //       // Calculate new order index based on target's current position
  //       const newOrderIndex = targetPerson.orderIndex || 0;

  //       // Call the reorder API
  //       await treeAPI.reorderPerson(window.NASAB_CURRENT_TREE_ID, draggedPerson.id, newOrderIndex);

  //       // Refresh the tree
  //       await loadRootTree();

  //       console.log('Person reordered successfully');
  //     }
  //   } catch (error) {
  //     console.error('Error reordering person:', error);
  //     // Show error to user if needed
  //     if (error.response?.data?.error) {
  //       alert(`Failed to reorder: ${error.response.data.error}`);
  //     } else {
  //       alert('Failed to reorder person. They may not be siblings.');
  //     }
  //   } finally {
  //     setDraggedNode(null);
  //     setDragOverNode(null);
  //   }
  // }, [draggedNode, dragOverNode, readOnly, loadRootTree]);

  // Helper function to find parent of a person
  // const findParent = useCallback((node, personId) => {
  //   if (!node) return null;

  //   const children = node.children || [];
  //   for (const child of children) {
  //     const childPerson = child.person || child;
  //     if (childPerson.id === personId) {
  //       return node;
  //     }
  //     const found = findParent(child, personId);
  //     if (found) return found;
  //   }
  //   return null;
  // }, []);

  // Capture a lightweight thumbnail using the MiniMap's SVG
  // const captureThumb = useCallback(() => {
  //   try {
  //     if (typeof window === 'undefined') return;
  //     const treeId = window.NASAB_CURRENT_TREE_ID;
  //     if (!treeId) return;
  //     const container = document.querySelector('.react-flow');
  //     if (!container) return;
  //     const svg = container.querySelector('.react-flow__minimap svg');
  //     if (!svg) return;
  //     const clone = svg.cloneNode(true);
  //     // Ensure a white background for visibility
  //     try {
  //       const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  //       rect.setAttribute('x', '0');
  //       rect.setAttribute('y', '0');
  //       rect.setAttribute('width', clone.getAttribute('width') || '200');
  //       rect.setAttribute('height', clone.getAttribute('height') || '140');
  //       rect.setAttribute('fill', '#ffffff');
  //       clone.insertBefore(rect, clone.firstChild);
  //     } catch (_) {}
  //     const xml = new XMLSerializer().serializeToString(clone);
  //     const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  //     localStorage.setItem(`treeThumb:${treeId}`, dataUrl);
  //   } catch (_) {}
  // }, []);

  // Keyboard shortcuts for large tree navigation
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            fitView({ padding: 0.1, duration: 500 });
          }
          break;
        case 'u':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            zoomTo(0.05, { duration: 300 });
          }
          break;
        case '+':
        case '=':
          event.preventDefault();
          zoomIn({ duration: 200 });
          break;
        case '-':
          event.preventDefault();
          zoomOut({ duration: 200 });
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [fitView, zoomIn, zoomOut, zoomTo]);

  // Only show the full loading screen on the INITIAL load (no data yet).
  // For background refreshes (after person edits etc.) we keep ReactFlow mounted
  // so the viewport position is preserved.
  if (loading && !treeData) {
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

  // Only show "no data" message if we've actually tried to load and there's nothing
  // Don't show it during initial loading to prevent flash
  if (!loading && !error && nodes.length === 0 && hasAttemptedLoad) {
    return (
      <div className="w-full h-full bg-gray-50 dark:bg-gray-900" style={{ minHeight: '600px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-muted dark:text-gray-400 text-xl mb-4">No family tree data available</div>
            <Button onClick={loadRootTree}>Load Tree Data</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
  <div
    ref={rfContainerRef}
    onMouseDown={handlePanStart}
    onMouseUp={handlePanEnd}
    onMouseLeave={handlePanEnd}
    className={`w-full h-full only-tree print:static bg-gray-50 dark:bg-gray-900 ${densityClass}`}
    style={{ minHeight: '600px', margin: 0, padding: 0, '--tree-label-scale': 1 }}
  >
      <ReactFlowErrorBoundary>
      <ReactFlow
        className="print:!bg-white print:visible print:!fixed print:!inset-0 print:!z-[9999] print:!w-screen print:!h-screen dark:!bg-gray-900"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMove={handleViewportChange}
        onMoveEnd={handleViewportChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={!focusedPersonId}
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 1.5
        }}
        minZoom={dynamicMinZoom}  // Computed from tree bounding box — limits zoom-out to ~15% beyond tree edge
        maxZoom={3}     // Allow higher zoom (300%) for detail view
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}  // Start with normal zoom and center
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          pathOptions: { curvature: 0.35 },
          style: { stroke: '#6B7280', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6B7280',
            width: 14,
            height: 14
          }
        }}
        nodesDraggable={false} // Disabled - use Edit Person modal for reordering
        panOnDrag={true}
        selectionOnDrag={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        // Double-click collapses and expands a branch in this app, so it must
        // not also zoom. React Flow's zoom runs on a native d3-zoom listener
        // attached to the pane, which is an ancestor of the node — the node's
        // own handler calls stopPropagation, but React delegates events at its
        // root, so the native event has already reached the pane and zoomed by
        // the time that runs. The only reliable fix is to not bind the gesture.
        // Zoom remains on scroll, pinch and the on-screen controls.
        zoomOnDoubleClick={false}
        panOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-left">
          <div className="relative print:hidden">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="form-input w-40 sm:w-56 md:w-64 ps-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            <svg
              className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
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
              <div className="absolute top-full start-0 end-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto scrollbar-hidden z-50">
                {searchResults.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => jumpToPerson(person.id)}
                    className="w-full text-start px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 dark:text-white">{person.name}</div>
                      {typeof person.generation === 'number' && (
                        <span className="ms-2 text-xs text-gray-500 dark:text-gray-400">Gen {person.generation}</span>
                      )}
                    </div>
                    {person.arabicName && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 arabic-text">{person.arabicName}</div>
                    )}
                    {(person.fatherName || typeof person.fatherGeneration === 'number') && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Father: {person.fatherName || 'Unknown'}{typeof person.fatherGeneration === 'number' ? ` (Gen ${person.fatherGeneration})` : ''}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>
        {/* Smart Navigation Tips Panel */}
        {/* {!isMobile && showNavigationTips && (
        <Panel position="top-center">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg shadow-sm relative">
            <button
              onClick={() => setShowNavigationTips(false)}
              className="absolute top-1 end-1 text-blue-400 hover:text-blue-600 text-sm"
              title="Dismiss tips"
            >
              ✕
            </button>
            <div className="text-xs text-blue-800 space-y-1 pe-4">
              <div className="font-medium">Navigation Tips for Large Trees:</div>
              <div>• <kbd className="bg-white px-1 rounded">Ctrl+F</kbd> Fit to view</div>
              <div>• <kbd className="bg-white px-1 rounded">Ctrl+U</kbd> Ultra zoom out (0.05x)</div>
              <div>• <kbd className="bg-white px-1 rounded">+/-</kbd> Zoom in/out</div>
              <div>• Use search to jump to specific people</div>
              <div>• Drag to pan, scroll to zoom</div>
            </div>
          </div>
        </Panel>
        )} */}
        <Panel position="top-right">
          <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-600 p-2 rounded-lg print:hidden zoom-controls">
            <div className="flex flex-col space-y-1">
              {/* Zoom In */}
              <IconButton aria-label="Zoom In" onClick={() => zoomIn({ duration: 200 })} size="small" className="dark:text-gray-300 dark:hover:bg-gray-700">
                <ZoomInOutlinedIcon fontSize="small" />
              </IconButton>
              
              {/* Zoom Out */}
              <IconButton aria-label="Zoom Out" onClick={() => zoomOut({ duration: 200 })} size="small" className="dark:text-gray-300 dark:hover:bg-gray-700">
                <ZoomOutOutlinedIcon fontSize="small" />
              </IconButton>
              
              {/* Fit to View */}
              <IconButton aria-label="Fit to View" onClick={() => fitView({ padding: 0.1, duration: 500 })} size="small" className="dark:text-gray-300 dark:hover:bg-gray-700">
                <FitScreenOutlinedIcon fontSize="small" />
              </IconButton>
              
              {/* Ultra Zoom Out for Large Trees */}
              {nodes.length > 100 && (
                <IconButton 
                  aria-label="Ultra Zoom Out" 
                  onClick={() => zoomTo(0.05, { duration: 300 })}
                  size="small"
                  title="Ultra zoom out for very large trees"
                  className="dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <span className="text-xs font-bold">0.05x</span>
                </IconButton>
              )}
              
              {/* Print Button — desktop only */}
              {!isMobile && (
                <IconButton aria-label="Print Tree" onClick={() => window.print()} size="small" title="Print Tree" className="dark:text-gray-300 dark:hover:bg-gray-700">
                  <PrintIcon fontSize="small" />
                </IconButton>
              )}

              {/* Share Button */}
              <ShareButton
                url={window.location.href}
                title="My Family Tree"
                text="Check out my family tree on NasabLink!"
                hashtags={['FamilyTree', 'Genealogy', 'NasabLink']}
                variant="icon"
              />
              
            </div>
          </div>
        </Panel>
      </ReactFlow>
      </ReactFlowErrorBoundary>

      {/* Delete Person Confirmation Dialog */}
      <DeletePersonConfirmDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        person={personToDelete}
        descendantCount={personToDelete && treeData ? countDescendants(treeData, personToDelete.id) : 0}
      />

      {/* Undo Delete Toast */}
      {showUndoToast && deletedPersonBackup && (
        <div className="fixed bottom-4 start-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-sm">
              Deleted {deletedPersonBackup.name}
            </span>
            <button
              onClick={handleUndoDelete}
              className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
            >
              Undo
            </button>
            <button
              onClick={() => {
                if (undoTimeoutId) clearTimeout(undoTimeoutId);
                setShowUndoToast(false);
                setDeletedPersonBackup(null);
              }}
              className="text-gray-400 hover:text-white ms-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactFlowTreeViewer;
