import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { treeAPI } from '../services/api';
import ReactFlowTreeViewerWrapper from '../components/ReactFlowTreeViewerWrapper';
import PersonDetailModal from '../components/PersonDetailModal';
import { LoadingSpinner } from '../components/ui/Loading';

const PublicTreeViewerPage = () => {
  const { treeId, token } = useParams();
  const [treeData, setTreeData] = useState(null);
  const [layoutMode, setLayoutMode] = useState('VERTICAL');
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailPerson, setDetailPerson] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await treeAPI.getPublicTree(treeId, token);
        setTreeData(res.data);
        // The tree's arrangement and its custom field definitions ride on the
        // root node of this response — a viewer link cannot fetch either.
        setLayoutMode(res.data?.layoutMode || 'VERTICAL');
        setCustomFieldDefs(res.data?.fields || []);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) setError('This viewer link was not found.');
        else if (status === 410) setError('This viewer link has expired or was revoked.');
        else setError('Unable to load tree from viewer link.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [treeId, token]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
        <LoadingSpinner size="lg" />
        <span className="text-sm">Loading tree...</span>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-3">Viewer Link</h1>
        <p className="text-red-600">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <div style={{ flex: 1, minHeight: '600px', position: 'relative', paddingTop: 64 }}>
        {/* We reuse ReactFlowTreeViewer, feeding it the data via a minimal wrapper approach */}
        <ReactFlowTreeViewerWrapper
          focusedPersonId={null}
          refreshTrigger={0}
          // No edit/add in read-only mode — view details still available
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
};

export default PublicTreeViewerPage;
