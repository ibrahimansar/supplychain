import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { meAPI } from '../services/api';

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

/**
 * One banner for everything worth saying about the account's plan, in priority
 * order — only the most urgent is shown, so the page is never stacked with
 * notices:
 *
 *   1. over the tree limit after a downgrade (blocks an action they'll try)
 *   2. in the post-expiry grace period (time-critical)
 *   3. trial ending soon
 *   4. the free trial is still available (promotion)
 *
 * Renders nothing when the plan is healthy and there is no offer to make.
 */
const PlanStatusBanner = () => {
  const [entitlements, setEntitlements] = useState(null);

  useEffect(() => {
    let active = true;
    meAPI.getEntitlements()
      .then(res => { if (active) setEntitlements(res.data); })
      .catch(() => { /* never block the page on this */ });
    return () => { active = false; };
  }, []);

  if (!entitlements) return null;

  const { trees, inGracePeriod, graceEndsAt, onTrial, expiry, trialAvailable, trialMonths } = entitlements;
  const overLimit = trees?.overLimit;
  const trialDaysLeft = onTrial ? daysUntil(expiry) : null;
  // Only nag about the trial ending once it's actually close.
  const trialEndingSoon = trialDaysLeft !== null && trialDaysLeft <= 14;

  if (!overLimit && !inGracePeriod && !trialEndingSoon && !trialAvailable) return null;

  const shell = (tone, children) => (
    <div className={`rounded-xl border p-4 mb-4 ${tone}`} role="status">{children}</div>
  );

  if (overLimit) {
    return shell('bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', (
      <>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          You have more trees than your plan allows
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          You have {trees.used} trees; your plan allows {trees.limit}. Your existing trees are
          untouched and fully usable — you just can&apos;t create new ones until you&apos;re back
          under the limit or on Plus again.
        </p>
        <Link to="/subscription" className="inline-block mt-3 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline">
          View plans
        </Link>
      </>
    ));
  }

  if (inGracePeriod) {
    return shell('bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', (
      <>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Your Plus plan has expired</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          You keep Plus features until <span className="font-medium">{formatDate(graceEndsAt)}</span>.
          Nothing will be deleted when it ends — your trees, people and documents stay exactly as
          they are, and you will still be able to view and export everything.
        </p>
        <Link to="/subscription" className="inline-block mt-3 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline">
          Renew Plus
        </Link>
      </>
    ));
  }

  if (trialEndingSoon) {
    return shell('bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', (
      <>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          {trialDaysLeft === 0
            ? 'Your free trial ends today'
            : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}`}
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          After {formatDate(expiry)} your account returns to the free plan. Nothing is deleted —
          anything over the free limits stays, you just can&apos;t add beyond them.
        </p>
        <Link to="/subscription" className="inline-block mt-3 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline">
          Continue with Plus
        </Link>
      </>
    ));
  }

  // trialAvailable — the promotion
  return shell('bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800', (
    <div className="flex items-start gap-3">
      <Crown className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          Try Plus free for {trialMonths} months
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Bigger trees, more collaborators, document storage and advanced trees. No card required,
          and it ends on its own — we never charge you automatically.
        </p>
        <Link to="/subscription" className="inline-block mt-3 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline">
          Start free trial
        </Link>
      </div>
    </div>
  ));
};

export default PlanStatusBanner;
