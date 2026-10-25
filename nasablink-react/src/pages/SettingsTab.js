import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { treeAPI } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/Loading';
import { useI18n } from '../i18n/I18nContext';

const SettingsTab = ({ treeId, showToast }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [treeInfo, setTreeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [demoting, setDemoting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: '', message: '' });

  useEffect(() => {
    loadTreeInfo();
  }, [treeId]);

  const loadTreeInfo = async () => {
    try {
      setLoading(true);
      const response = await treeAPI.getTreeInfo(treeId);
      setTreeInfo(response.data);
    } catch (error) {
      console.error('Error loading tree info:', error);
      showToast('Failed to load tree information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = () => {
    setConfirmDialog({
      open: true,
      action: 'promote',
      title: 'Promote to Advanced Tree',
      message: 'Are you sure you want to promote this tree to Advanced? This will enable Documents and future advanced features. This action requires a PLUS subscription.'
    });
  };

  const handleDemote = () => {
    setConfirmDialog({
      open: true,
      action: 'demote',
      title: 'Demote to Simple Tree',
      message: 'Are you sure you want to demote this tree to Simple? All documents will remain accessible, but new documents cannot be added until promoted again.'
    });
  };

  const executeAction = async () => {
    const { action } = confirmDialog;
    setConfirmDialog({ open: false, action: null, title: '', message: '' });

    try {
      if (action === 'promote') {
        setPromoting(true);
        await treeAPI.promoteTree(treeId);
        showToast('Tree promoted to Advanced successfully');
        await loadTreeInfo();
        window.dispatchEvent(new CustomEvent('treeTypeChanged', { detail: { treeId } }));
      } else if (action === 'demote') {
        setDemoting(true);
        await treeAPI.demoteTree(treeId);
        showToast('Tree demoted to Simple successfully');
        await loadTreeInfo();
        window.dispatchEvent(new CustomEvent('treeTypeChanged', { detail: { treeId } }));
      }
    } catch (error) {
      console.error(`Error ${action}ing tree:`, error);
      const errorMessage = error?.response?.data?.message || `Failed to ${action} tree`;
      showToast(errorMessage, 'error');
    } finally {
      setPromoting(false);
      setDemoting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  const isAdvanced = treeInfo?.treeType === 'ADVANCED';
  const isPlusUser = user?.subscriptionStatus === 'PLUS';

  return (
    <>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tree Settings</h2>

          <div className="space-y-6">
            {/* Tree Type Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Tree Type</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isAdvanced
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {isAdvanced ? 'Advanced' : 'Simple'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isAdvanced ? 'Includes Documents and advanced features' : 'Basic family tree features'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isAdvanced && isPlusUser && (
                      <Button
                        onClick={handlePromote}
                        loading={promoting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Promote to Advanced
                      </Button>
                    )}
                    {isAdvanced && (
                      <Button
                        onClick={handleDemote}
                        loading={demoting}
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        Demote to Simple
                      </Button>
                    )}
                  </div>
                </div>

                {!isPlusUser && !isAdvanced && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md">
                    <div className="flex">
                      <div className="text-amber-800 dark:text-amber-300">
                        <strong>PLUS Subscription Required</strong>
                        <p className="text-sm mt-1">
                          To promote this tree to Advanced and access Documents, you need a PLUS subscription.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features Comparison */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Feature Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Simple Tree</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Basic family tree structure</li>
                    <li>• Member management</li>
                    <li>• Tree connections</li>
                    <li>• Public sharing</li>
                  </ul>
                </div>
                <div className="border border-green-200 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Advanced Tree (PLUS)</h4>
                  <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                    <li>• All Simple features</li>
                    <li>• <strong>Documents</strong> - Upload and manage files</li>
                    <li>• Future advanced features</li>
                    <li>• Higher limits</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}
        onConfirm={executeAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.action === 'promote' ? 'Promote' : 'Demote'}
        variant={confirmDialog.action === 'promote' ? 'primary' : 'warning'}
      />
    </>
  );
};

export default SettingsTab;