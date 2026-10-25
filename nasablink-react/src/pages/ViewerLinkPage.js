import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { treeAPI } from '../services/api';
import { getApiErrorCode, getApiErrorMessage } from '../utils/apiError';
import Card from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/Loading';

const ViewerLinkPage = () => {
  const { treeId, token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
  // Use the new public API endpoint for viewer link consumption
  await treeAPI.getPublicTree(treeId, token);
  navigate(`/public-tree/${treeId}/${token}`, { replace: true });
      } catch (e) {
        const status = e?.response?.status;
        const code = getApiErrorCode(e?.response?.data);
        let msg = getApiErrorMessage(e?.response?.data, '');
        if (code === 'VIEWER_LIMIT_EXCEEDED') msg = 'You have reached the maximum number of viewers for this tree.';
        if (status === 404) setError('Viewer link not found');
        else if (status === 410) setError('Viewer link expired or revoked');
        else if (msg) setError(msg);
        else setError('Unable to grant viewer access for this link');
      }
    };
    run();
  }, [treeId, token, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center px-4">
      <div className="text-center">
        {!error ? (
          <>
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted dark:text-gray-400">Preparing viewer session...</p>
          </>
        ) : (
          <Card className="max-w-md w-full p-8 text-center">
            <h1 className="heading-3 mb-1 dark:text-white">Viewer Link</h1>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ViewerLinkPage;

