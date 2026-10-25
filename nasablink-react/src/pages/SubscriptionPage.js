import React, { useState, useEffect } from 'react';
import { paymentAPI, meAPI, getApiErrorMessage } from '../services/api';
import Button from '../components/ui/Button';
import { Crown, Check, Zap, Shield, Globe, Loader2, AlertTriangle, ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const daysUntil = (value) => {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
};

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with your family tree',
    icon: Shield,
    features: [
      '3 family trees',
      'Up to 200 people per tree',
      '2 admins and 200 viewers per tree',
      'All tree layout options',
      'GEDCOM import & full data export',
      'Multi-language & RTL support',
    ],
    highlighted: false,
  },
  {
    id: 'PLUS',
    name: 'Plus',
    price: '$99.99',
    period: '/year',
    description: 'Unlock the full power of NasabLink',
    icon: Crown,
    features: [
      '10 family trees',
      'Up to 1,000 people per tree',
      '10 admins, 10 verifiers and 500 viewers per tree',
      '500 document uploads',
      'Advanced trees & governance',
      'Cross-tree person linking',
      'Timeline & statistics',
      'Priority support',
    ],
    highlighted: true,
  },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    // Entitlements carry the plan, usage and trial state; payment status only
    // adds the provider's subscription id. Load both, and don't let a failure
    // in one blank the page.
    const [statusRes, entitlementsRes] = await Promise.allSettled([
      paymentAPI.getStatus(),
      meAPI.getEntitlements(),
    ]);
    if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data);
    if (entitlementsRes.status === 'fulfilled') setEntitlements(entitlementsRes.value.data);
    if (statusRes.status === 'rejected' && entitlementsRes.status === 'rejected') {
      setError('Failed to load subscription status');
    }
    setLoading(false);
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await meAPI.startTrial();
      setSuccess(`Your free trial is active until ${formatDate(res.data.endsAt)}. Enjoy Plus!`);
      await loadStatus();
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Could not start your trial. Please try again.');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (planId === 'FREE') return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await paymentAPI.subscribe(planId);
      setSuccess(needsRenewal
        ? 'Plus renewed for another year. Thank you!'
        : 'Subscription activated successfully!');
      await loadStatus();
    } catch (err) {
      setError(getApiErrorMessage(err?.response?.data, 'Failed to subscribe. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!status?.subscriptionId) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await paymentAPI.cancel(status.subscriptionId);
      setSuccess('Subscription cancelled. You can continue using Plus features until the end of your billing period.');
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel subscription. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Prefer entitlements: it is the source of truth for the plan and still
  // resolves when the payment provider call fails.
  const isPlus = Boolean(entitlements ? entitlements.isPlus : status?.isPlus);
  const needsRenewal = Boolean(entitlements?.inGracePeriod || (entitlements?.expired && isPlus));
  const showCancel = isPlus && !entitlements?.onTrial && !needsRenewal && Boolean(status?.subscriptionId);

  const isCurrentPlan = (planId) => {
    if (isPlus === undefined || isPlus === null) return false;
    return planId === 'PLUS' ? isPlus : !isPlus;
  };

  const renderRenewButton = (className = '') => (
    <Button
      onClick={() => handleSubscribe('PLUS')}
      loading={actionLoading}
      disabled={actionLoading}
      className={`rounded-xl ${className}`}
    >
      Renew Plus
    </Button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Subscription Plans
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Choose your plan
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Unlock premium features to build a richer, more detailed family tree.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Free trial offer — one time only, so it disappears for good once used */}
        {entitlements?.trialAvailable && (
          <div className="mb-8 p-5 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Crown className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Try Plus free for {entitlements.trialMonths} months
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No card required and nothing to cancel — the trial simply ends, and your account
                  returns to the free plan. You can only use it once.
                </p>
                <Button
                  onClick={handleStartTrial}
                  loading={trialLoading}
                  disabled={trialLoading}
                  className="mt-4"
                >
                  Start my free trial
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Current plan, usage, and what happens next */}
        {entitlements && (
          <div className="mb-8 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {entitlements.isPlus
                  ? <Crown className="w-6 h-6 text-yellow-500" />
                  : <Shield className="w-6 h-6 text-gray-400" />}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Current plan:{' '}
                    <span className={entitlements.isPlus ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}>
                      {entitlements.isPlus ? 'Plus' : 'Free'}
                    </span>
                    {entitlements.onTrial && (
                      <span className="ms-2 text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                        Free trial
                      </span>
                    )}
                    {needsRenewal && (
                      <span className="ms-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                        Renewal due
                      </span>
                    )}
                  </p>
                  {entitlements.expiry && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {entitlements.onTrial
                        ? `Trial ends ${formatDate(entitlements.expiry)} (${daysUntil(entitlements.expiry)} days left)`
                        : entitlements.inGracePeriod
                          ? `Expired — Plus features remain until ${formatDate(entitlements.graceEndsAt)}`
                          : `Renews ${formatDate(entitlements.expiry)}`}
                    </p>
                  )}
                  {!entitlements.isPlus && entitlements.trialUsed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Your free trial has already been used.
                    </p>
                  )}
                </div>
              </div>

              {needsRenewal ? renderRenewButton() : showCancel ? (
                <Button variant="outline" onClick={handleCancel} loading={actionLoading} disabled={actionLoading}>
                  Cancel subscription
                </Button>
              ) : null}
            </div>

            {/* Usage. Over-limit is normal after a downgrade and must not read as an error. */}
            {entitlements.trees && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Trees</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {entitlements.trees.used} of {entitlements.trees.limit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Document uploads</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {entitlements.documentLimit > 0 ? `Up to ${entitlements.documentLimit}` : 'Not included'}
                  </p>
                </div>
                {entitlements.trees.overLimit && (
                  <p className="col-span-2 text-xs text-gray-500 dark:text-gray-400">
                    You have more trees than this plan allows. Nothing has been removed — you simply
                    can&apos;t create new ones until you&apos;re under the limit or back on Plus.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = isCurrentPlan(plan.id);
            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-900 rounded-2xl border-2 p-6 transition-all ${
                  plan.highlighted
                    ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlighted ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Icon className={`w-5 h-5 ${plan.highlighted ? 'text-primary-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-primary-500' : 'text-green-500'}`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.id === 'PLUS' && needsRenewal ? (
                  <div className="w-full space-y-2">
                    {renderRenewButton('w-full')}
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                      Renew now to keep Plus after {formatDate(entitlements?.graceEndsAt || entitlements?.expiry)}.
                    </p>
                  </div>
                ) : isCurrent ? (
                  <div className="w-full">
                    {plan.id === 'PLUS' ? (
                      <div className="space-y-2">
                        <div className="w-full py-2.5 text-center text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                          ✓ Current Plan
                        </div>
                        {showCancel && (
                          <button
                            onClick={handleCancel}
                            disabled={actionLoading}
                            className="w-full py-2 text-center text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          >
                            {actionLoading ? 'Processing...' : 'Cancel subscription'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-full py-2.5 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        Current Plan
                      </div>
                    )}
                  </div>
                ) : plan.id === 'PLUS' ? (
                  /* Payments not yet live — show Coming Soon */
                  <div className="w-full space-y-2">
                    <div className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium cursor-not-allowed select-none">
                      <Clock className="w-4 h-4" />
                      Coming Soon
                    </div>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                      Paid upgrades are coming soon. Stay tuned!
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={actionLoading || plan.id === 'FREE'}
                    className={`w-full rounded-xl ${plan.highlighted ? '' : 'bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'}`}
                  >
                    {actionLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </span>
                    ) : (
                      'Downgrade to Free'
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature comparison footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> Public discovery
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Advanced features
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Plus features require an active subscription. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
