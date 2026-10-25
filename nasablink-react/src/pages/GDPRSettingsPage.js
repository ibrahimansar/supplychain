import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { gdprAPI } from '../services/api';
import { Download, Trash2, Shield, AlertTriangle, CheckCircle, X } from 'lucide-react';
import Button from '../components/ui/Button';

export default function GDPRSettingsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [toast, setToast] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({
    dataProcessing: true,
    marketing: false,
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchDeletionStatus();
    fetchPrivacySettings();
  }, []);

  const fetchDeletionStatus = async () => {
    try {
      const res = await gdprAPI.getDeletionStatus();
      setDeletionStatus(res.data);
    } catch {
      // no pending deletion
    }
  };

  const fetchPrivacySettings = async () => {
    try {
      const res = await gdprAPI.getPrivacySettings();
      const data = res.data;
      setPrivacySettings({
        dataProcessing: data.dataProcessingConsent ?? true,
        marketing: data.marketingConsent ?? false,
      });
    } catch {
      // keep defaults
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const res = await gdprAPI.exportData();
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nasablink-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(t('gdpr.data_exported', 'Data export downloaded successfully'));
    } catch {
      showToast(t('gdpr.export_failed', 'Failed to export data. Please try again.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    setLoading(true);
    try {
      const res = await gdprAPI.deleteAccount(deleteReason);
      const data = res.data;
      setDeletionStatus({
        hasPendingDeletion: true,
        requestedAt: data.requestedAt || new Date().toISOString(),
        scheduledDeletionDate: data.scheduledDeletionDate,
        daysRemaining: data.gracePeriodDays || 30,
      });
      setShowDeleteConfirm(false);
      showToast(t('gdpr.deletion_requested', 'Account deletion requested. You have 30 days to cancel.'));
    } catch {
      showToast(t('gdpr.deletion_failed', 'Failed to request account deletion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    try {
      await gdprAPI.cancelDeletion();
      setDeletionStatus(null);
      showToast(t('gdpr.deletion_cancelled', 'Account deletion request cancelled'));
    } catch {
      showToast(t('gdpr.cancel_failed', 'Failed to cancel deletion request.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacySettings = async () => {
    setLoading(true);
    try {
      await gdprAPI.savePrivacyConsents(privacySettings);
      showToast(t('gdpr.preferences_saved', 'Privacy preferences saved'));
    } catch {
      showToast(t('gdpr.save_failed', 'Failed to save privacy settings.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pt-20 pb-16">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[3000] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('gdpr.title', 'Privacy & Data')}
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage your privacy settings, export your data, or request account deletion under GDPR.
          </p>
        </div>

        <div className="space-y-6">
          {/* Privacy Settings */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
              {t('gdpr.privacy_settings', 'Privacy Settings')}
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {t('gdpr.data_processing_consent', 'Data Processing Consent')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('gdpr.data_processing_description', 'Allow us to process your data to provide our services')}
                  </p>
                </div>
                <Toggle
                  checked={privacySettings.dataProcessing}
                  onChange={() => setPrivacySettings(p => ({ ...p, dataProcessing: !p.dataProcessing }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {t('gdpr.marketing_consent', 'Marketing Communications')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('gdpr.marketing_description', 'Receive updates, tips, and promotional emails')}
                  </p>
                </div>
                <Toggle
                  checked={privacySettings.marketing}
                  onChange={() => setPrivacySettings(p => ({ ...p, marketing: !p.marketing }))}
                />
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="solid"
                size="sm"
                onClick={handleSavePrivacySettings}
                loading={loading}
                className="rounded-xl"
              >
                {t('gdpr.save_preferences', 'Save Preferences')}
              </Button>
            </div>
          </div>

          {/* Export Data */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {t('gdpr.export_data', 'Export My Data')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t('gdpr.export_description', 'Download all your data including family trees, person records, and account information in JSON format.')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  loading={loading}
                  className="rounded-xl"
                >
                  <Download className="h-4 w-4 me-2" />
                  {t('gdpr.export_button', 'Download Data Export')}
                </Button>
              </div>
            </div>
          </div>

          {/* Account Deletion */}
          <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">
                  {t('gdpr.delete_account', 'Delete Account')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t('gdpr.delete_description', 'Permanently delete your account and all associated data. This includes all family trees, person records, documents, and roles.')}
                </p>

                {deletionStatus?.hasPendingDeletion ? (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                        {t('gdpr.deletion_pending', 'Deletion Pending')}
                      </p>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      Scheduled for deletion on{' '}
                      <strong>{new Date(deletionStatus.scheduledDeletionDate).toLocaleDateString()}</strong>
                      {' '}({deletionStatus.daysRemaining} days remaining).
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelDeletion}
                      disabled={loading}
                      className="rounded-xl border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    >
                      {t('gdpr.cancel_deletion', 'Cancel Deletion Request')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-red-500 dark:text-red-400 mb-4 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('gdpr.delete_warning', 'This action cannot be undone. You will have 30 days to cancel before permanent deletion.')}
                    </p>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-xl"
                    >
                      <Trash2 className="h-4 w-4 me-2" />
                      {t('gdpr.delete_button', 'Request Account Deletion')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('gdpr.delete_confirm_title', 'Confirm Account Deletion')}
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {t('gdpr.delete_confirm_message', 'Are you sure? This will permanently delete all your trees, people, documents, and account data after a 30-day grace period.')}
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('gdpr.delete_reason_label', 'Reason for deletion (optional)')}
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={t('gdpr.delete_reason_placeholder', 'Help us improve by telling us why...')}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-600"
                rows="3"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={handleRequestDeletion}
                loading={loading}
              >
                {t('common.confirm', 'Confirm Deletion')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
