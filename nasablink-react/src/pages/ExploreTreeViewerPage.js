import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { treeAPI } from '../services/api';
import ReactFlowTreeViewerWrapper from '../components/ReactFlowTreeViewerWrapper';
import PersonDetailModal from '../components/PersonDetailModal';
import { LoadingSpinner } from '../components/ui/Loading';
import { ArrowLeft, Eye } from 'lucide-react';

export default function ExploreTreeViewerPage() {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusPersonId = searchParams.get('focus') || null;
  const [treeData, setTreeData] = useState(null);
  const [treeName, setTreeName] = useState('');
  const [layoutMode, setLayoutMode] = useState('VERTICAL');
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailPerson, setDetailPerson] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await treeAPI.getExplorableTree(treeId);
        if (!active) return;
        const data = res.data;
        // getExplorableTree returns { tree: { name, ... }, data: TreeNode }
        setTreeName(data.tree?.name || data.name || 'Family Tree');
        setTreeData(data.data ?? data.treeData ?? data);
        // Render the tree the way its owner arranged it, not the default.
        setLayoutMode(data.tree?.layoutMode || data.data?.layoutMode || 'VERTICAL');
        // Custom field definitions ride on the root node — a public visitor
        // cannot call the authenticated fields endpoint.
        setCustomFieldDefs(data.data?.fields || []);
      } catch (e) {
        if (!active) return;
        const status = e?.response?.status;
        if (status === 404) setError('This tree was not found or is no longer public.');
        else if (status === 403) setError('This tree is private and cannot be viewed.');
        else setError('Unable to load the tree. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [treeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <LoadingSpinner size="lg" />
          <span className="text-sm">Loading tree…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Cannot load tree</h1>
          <p className="text-red-500 mb-6">{error}</p>
          <button
            onClick={() => navigate(`/explore/${treeId}`)}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to tree details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Slim header bar */}
      <div className="fixed top-16 start-0 end-0 z-40 h-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
        <button
          onClick={() => navigate(`/explore/${treeId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to details
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">{treeName}</span>
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          <Eye className="w-3.5 h-3.5" /> Read-only view
        </span>
      </div>

      {/* Tree viewer fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', paddingTop: 104 }}>
        <ReactFlowTreeViewerWrapper
          focusedPersonId={focusPersonId}
          refreshTrigger={0}
          onPersonClick={() => {}}
          onAddDescendant={() => {}}
          onViewPerson={(person) => setDetailPerson(person)}
          readOnly
          initialTreeData={treeData}
          layoutMode={layoutMode}
        />
      </div>
      {detailPerson && (
        <PersonDetailModal
          person={detailPerson}
          treeId={treeId}
          fields={customFieldDefs}
          onClose={() => setDetailPerson(null)}
        />
      )}
    </div>
  );
}
