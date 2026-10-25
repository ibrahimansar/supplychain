import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treeAPI } from '../services/api';
import { LoadingSpinner } from '../components/ui/Loading';
import TimelineChart from '../components/TimelineChart';
import Toast from '../components/ui/Toast';

const TimelinePage = () => {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState(null);
  const [treeName, setTreeName] = useState('');
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, infoRes] = await Promise.all([
        treeAPI.getTree(),
        treeAPI.getTreeInfo(treeId)
      ]);
      setTreeData(treeRes.data || null);
      setTreeName(infoRes.data?.name || 'Family Tree');
    } catch (e) {
      if (e?.response?.status === 403) {
        navigate('/trees', { replace: true });
        return;
      }
      setToast({ msg: 'Failed to load timeline data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [treeId, navigate]);

  useEffect(() => {
    if (treeId) {
      // Set global tree ID for API calls
      if (typeof window !== 'undefined') {
        window.NASAB_CURRENT_TREE_ID = treeId;
      }
      loadData();
    }
  }, [treeId, loadData]);

  const handlePersonClick = useCallback((personId) => {
    // Navigate to the person in the tree view
    navigate(`/trees/${treeId}?focus=${personId}`);
  }, [navigate, treeId]);

  // const showToast = (msg, type = 'success') => {
  //   setToast({ msg, type });
  //   setTimeout(() => setToast(null), 3000);
  // };

  return (
    <div className="pt-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      
      <div className="w-full max-w-none mx-auto px-3 sm:px-4 lg:px-5 xl:px-6 py-5 sm:py-6">
        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(`/trees/${treeId}`)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Back to Tree"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Family Timeline
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {treeName}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visualize the lifespans of family members across generations. Click on any bar to navigate to that person in the tree.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading timeline...</p>
            </div>
          </div>
        ) : treeData ? (
          <TimelineChart 
            treeData={treeData} 
            onPersonClick={handlePersonClick}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Timeline Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add birth years to family members to see them on the timeline.
            </p>
            <button
              onClick={() => navigate(`/trees/${treeId}`)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go to Tree
            </button>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
            How to use the Timeline
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• <strong>Zoom:</strong> Use the +/- buttons to zoom in or out</li>
            <li>• <strong>Pan:</strong> Click and drag to move left/right</li>
            <li>• <strong>Details:</strong> Hover over a bar to see person details</li>
            <li>• <strong>Navigate:</strong> Click a bar to go to that person in the tree</li>
            <li>• <strong>Colors:</strong> Each generation has a different color</li>
            <li>• <strong>Living:</strong> Faded bars indicate people who are still living (no death year)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TimelinePage;
