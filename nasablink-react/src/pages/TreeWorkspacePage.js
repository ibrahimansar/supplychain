import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TreeViewPage from './TreeViewPage';
import { treeAPI } from '../services/api';
import { TemplateProvider } from '../contexts/TemplateContext';
import { DEFAULT_TEMPLATE_ID } from '../templates';

// Thin wrapper to reuse existing TreeViewPage under new route
const TreeWorkspacePage = () => {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [accessError, setAccessError] = useState(null);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);

  // Set synchronously so children effects see it on first render
  if (typeof window !== 'undefined') {
    window.NASAB_CURRENT_TREE_ID = treeId;
  }

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const [treeRes, infoRes] = await Promise.all([
          treeAPI.getTree(),
          treeAPI.getTreeInfo(treeId).catch(() => null),
        ]);
        if (cancelled) return;
        void treeRes;
        const tid = infoRes?.data?.templateId;
        if (tid) setTemplateId(tid);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          navigate('/trees', { replace: true });
        } else if (status === 401) {
          navigate('/login', { replace: true });
        } else if (status === 403) {
          setAccessError('You do not have permission to access this tree.');
        } else if (status >= 500) {
          setAccessError('The server encountered an error loading this tree. Please try again.');
        }
        // No status (network error): TreeViewPage will show its own error state
      }
    };
    check();
    return () => { cancelled = true; };
  }, [treeId, navigate]);

  if (accessError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cannot Access Tree</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{accessError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setAccessError(null); window.location.reload(); }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/trees')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Back to My Trees
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TemplateProvider templateId={templateId}>
      <TreeViewPage />
    </TemplateProvider>
  );
};

export default TreeWorkspacePage;
