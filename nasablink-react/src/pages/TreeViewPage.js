import { appPathname } from '../config/basePath';
import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactFlowTreeViewerWrapper from '../components/ReactFlowTreeViewerWrapper';
import AddDescendantModal from '../components/AddDescendantModal';
import EditPersonModal from '../components/EditPersonModal';
import PersonDetailModal from '../components/PersonDetailModal';
import ProductTour, { TREE_TOUR_SLIDES } from '../components/ProductTour';
import { treeAPI } from '../services/api';
import { HelpCircle } from 'lucide-react';
import { useWorkspaceTemplate } from '../contexts/TemplateContext';

const TOUR_SEEN_KEY = (userId) => `nasablink_tour_seen_${userId}`;
/** Auto-tour only for people who can edit (ADMIN / VERIFIER), once per user. */
const canReceiveTour = (role) => role === 'ADMIN' || role === 'VERIFIER';

const TreeViewPage = () => {
  const [searchParams] = useSearchParams();
  const [addDescendantData, setAddDescendantData] = useState(null);
  const [addParentData, setAddParentData] = useState(null); // { child: PersonDto }
  const [editPersonData, setEditPersonData] = useState(null);
  const [detailPersonData, setDetailPersonData] = useState(null);
  const [refreshTree, setRefreshTree] = useState(0);
  const [focusedPersonId, setFocusedPersonId] = useState(
    () => searchParams.get('focus') || null   // lazy-init from URL so fitView is disabled from the very first render
  );
  const { user } = useAuth();
  const { label: tLabel } = useWorkspaceTemplate();

  // Tree layout mode (loaded from tree settings)
  const [layoutMode, setLayoutMode] = useState('VERTICAL');

  // Cross-tree person links: personId (string) → [{ otherPersonId, otherPersonName, otherTreeId, otherTreeName, navUrl, verified }]
  const [crossTreeLinksMap, setCrossTreeLinksMap] = useState(new Map());

  // Product Tour State — slide modal (no live DOM anchors)
  const [showTour, setShowTour] = useState(false);
  const treeId = useMemo(() => {
    if (typeof window !== 'undefined' && window.NASAB_CURRENT_TREE_ID) return window.NASAB_CURRENT_TREE_ID;
    const m = appPathname().match(/^\/trees\/([^/]+)/);
    return m ? m[1] : null;
  }, []); 
  const userRole = useMemo(() => {
    if (!user?.roles || !treeId) {
      console.log('User roles or treeId not found');
      return null;
    }
    const found = user.roles.find(r => String(r.treeId) === String(treeId));
    return found ? found.role : null;
  }, [user, treeId]);
  const readOnly = userRole === 'VIEWER';

  // Load tree layout mode from settings
  useEffect(() => {
    if (!treeId) return;
    treeAPI.getTreeInfo(treeId).then(res => {
      setLayoutMode(res.data?.layoutMode || 'VERTICAL');
    }).catch(() => { /* keep default */ });
  }, [treeId]);

  // Load cross-tree person links and build personId → links map
  useEffect(() => {
    if (!treeId) return;
    let active = true;
    treeAPI.getTreePersonLinks(treeId).then(res => {
      if (!active) return;
      const links = res.data || [];
      const map = new Map();
      links.forEach(link => {
        // PersonLinks mean "same person in both trees". Legacy auto-spouse links
        // wrongly used this table — hide them so spouses use the spouse UI instead.
        if (typeof link.notes === 'string' && link.notes.includes('Auto-linked via spouse')) return;

        let myPerson, otherPerson;
        if (String(link.personA?.treeId) === String(treeId)) {
          myPerson = link.personA;
          otherPerson = link.personB;
        } else {
          myPerson = link.personB;
          otherPerson = link.personA;
        }
        if (!myPerson || !otherPerson) return;
        // Determine navigation URL: use tree viewer if user has access, else public view-only
        const hasAccess = user?.roles?.some(r => String(r.treeId) === String(otherPerson.treeId));
        const navUrl = hasAccess
          ? `/trees/${otherPerson.treeId}?focus=${otherPerson.id}`
          : `/explore/${otherPerson.treeId}/view?focus=${otherPerson.id}`;
        const key = String(myPerson.id);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({
          otherPersonId: otherPerson.id,
          otherPersonName: otherPerson.name || otherPerson.arabicName,
          otherTreeId: otherPerson.treeId,
          otherTreeName: otherPerson.treeName,
          navUrl,
          verified: link.verified,
        });
      });
      setCrossTreeLinksMap(map);
    }).catch(() => { /* ignore — cross-tree links are optional */ });
    return () => { active = false; };
  }, [treeId, user?.roles]);

  // Handle focus query parameter from timeline navigation
  useEffect(() => {
    const focusParam = searchParams.get('focus');
    if (focusParam) {
      setFocusedPersonId(focusParam);
    }
  }, [searchParams]);

  const handlePersonClick = async (personId) => {
    setFocusedPersonId(personId);
  };

  const handleViewPerson = async (personOrId) => {
    try {
      const personId = personOrId?.id || personOrId;
      const response = await treeAPI.getPerson(personId);
      setDetailPersonData(response.data);
      setFocusedPersonId(personId);
    } catch (error) {
      // Fall back to node payload when the detail fetch fails (e.g. limited viewer)
      if (personOrId && typeof personOrId === 'object') {
        setDetailPersonData(personOrId);
        setFocusedPersonId(personOrId.id);
      } else {
        console.error('Error loading person details:', error);
      }
    }
  };

  const handleEditPerson = async (personId) => {
    try {
      const response = await treeAPI.getPerson(personId);
      setDetailPersonData(null);
      setEditPersonData(response.data);
    } catch (error) {
      console.error('Error loading person details:', error);
    }
  };

  const handleAddDescendant = async (parentOrId, opts = {}) => {
    try {
      if (parentOrId && typeof parentOrId === 'object' && parentOrId.id) {
        setAddDescendantData({ parent: parentOrId, preferSpouse: !!opts.preferSpouse });
        return;
      }

      const parentId = parentOrId;
      const response = await treeAPI.getPerson(parentId);
      setAddDescendantData({ parent: response.data, preferSpouse: !!opts.preferSpouse });
    } catch (error) {
      console.error('Error loading parent details:', error);
      alert('Unable to load parent details. Please try again.');
    }
  };

  const handlePersonUpdated = (personId) => {
    setEditPersonData(null);
    setRefreshTree(prev => prev + 1);
    setFocusedPersonId(personId);
  };

  const handleAddParent = async (childPerson) => {
    // childPerson is already the full person object from the node
    if (childPerson && typeof childPerson === 'object' && childPerson.id) {
      setAddParentData({ child: childPerson });
      return;
    }
    try {
      const response = await treeAPI.getPerson(childPerson);
      setAddParentData({ child: response.data });
    } catch (error) {
      console.error('Error loading child details:', error);
      alert('Unable to load person details. Please try again.');
    }
  };

  const handleParentAdded = (newPerson) => {
    setAddParentData(null);
    // Adding a parent changes the root — force full tree refresh
    setRefreshTree(prev => prev + 1);
    setFocusedPersonId(newPerson.id);
  };

  const handleDescendantAdded = (newPerson, parentId, relationshipType = 'descendant') => {
    setAddDescendantData(null);
    if (window.addPersonToTree) {
      window.addPersonToTree(newPerson, parentId, relationshipType);
    } else {
      setRefreshTree(prev => prev + 1);
    }
    // Focus on the newly added person
    setFocusedPersonId(newPerson.id);
  };

  // Product Tour Steps — auto-show once for editors only (not viewers / read-only).
  useEffect(() => {
    if (!treeId || !user?.id || readOnly || !canReceiveTour(userRole)) return undefined;

    const globalKey = TOUR_SEEN_KEY(user.id);
    const oldTreeKey = `nasablink_tour_${treeId}_${user.id}`;
    if (localStorage.getItem(oldTreeKey) && !localStorage.getItem(globalKey)) {
      localStorage.setItem(globalKey, 'seen');
    }

    if (localStorage.getItem(globalKey)) return undefined;

    const timer = setTimeout(() => setShowTour(true), 1200);
    return () => clearTimeout(timer);
  }, [treeId, user?.id, readOnly, userRole]);

  const markTourSeen = () => {
    if (user?.id) localStorage.setItem(TOUR_SEEN_KEY(user.id), 'seen');
  };

  const handleTourClose = () => {
    setShowTour(false);
    markTourSeen();
  };

  return (
    <div className="pt-20 dark:bg-gray-900" style={{ minHeight: '100vh', boxSizing: 'border-box', position: 'relative' }}>
      <div className="w-full h-full" style={{ height: 'calc(100vh - 5rem)', position: 'relative' }}>
        <ReactFlowTreeViewerWrapper
          refreshTrigger={refreshTree}
          onPersonClick={handlePersonClick}
          onAddDescendant={handleAddDescendant}
          onAddParent={!readOnly ? handleAddParent : undefined}
          onViewPerson={handleViewPerson}
          onEditPerson={!readOnly ? handleEditPerson : undefined}
          focusedPersonId={focusedPersonId}
          readOnly={readOnly}
          layoutMode={layoutMode}
          crossTreeLinksMap={crossTreeLinksMap}
          actionLabels={{
            addChild: tLabel('addChild', 'Add descendant'),
            addParent: tLabel('addParent', 'Add parent'),
            addMember: tLabel('addMember', 'Add family member'),
            viewNode: tLabel('viewNode', 'View details'),
            editNode: tLabel('editNode', 'Edit person'),
            deleteNode: tLabel('deleteNode', 'Delete person'),
          }}
        />
      </div>

      {!readOnly && addDescendantData && (
        <AddDescendantModal
          parent={addDescendantData.parent}
          treeId={treeId}
          layoutMode={layoutMode}
          preferSpouse={addDescendantData.preferSpouse}
          onClose={() => setAddDescendantData(null)}
          onDescendantAdded={handleDescendantAdded}
        />
      )}

      {!readOnly && addParentData && (
        <AddDescendantModal
          mode="parent"
          child={addParentData.child}
          treeId={treeId}
          onClose={() => setAddParentData(null)}
          onDescendantAdded={handleParentAdded}
        />
      )}

      {detailPersonData && (
        <PersonDetailModal
          person={detailPersonData}
          treeId={treeId}
          onClose={() => setDetailPersonData(null)}
          onEdit={!readOnly ? (p) => handleEditPerson(p.id) : undefined}
        />
      )}

      {!readOnly && editPersonData && (
        <EditPersonModal
          person={editPersonData}
          treeId={treeId}
          layoutMode={layoutMode}
          onClose={() => setEditPersonData(null)}
          onPersonUpdated={handlePersonUpdated}
        />
      )}

      {/* Help — replay slide tour (editors only) */}
      {canReceiveTour(userRole) && !showTour && (
        <button
          type="button"
          onClick={() => setShowTour(true)}
          className="fixed bottom-6 start-6 z-40 bg-white dark:bg-gray-800 rounded-full shadow-lg p-3 hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 print:hidden"
          title="Show product tour"
          aria-label="Show product tour"
        >
          <HelpCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      )}

      <ProductTour
        isOpen={showTour}
        onClose={handleTourClose}
        onSkip={handleTourClose}
        slides={TREE_TOUR_SLIDES}
        title="Tree tour"
      />
    </div>
  );
};

export default TreeViewPage;
