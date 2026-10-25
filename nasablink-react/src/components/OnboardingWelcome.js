import React from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

const OnboardingWelcome = () => {
  const { t } = useTranslation();
  const { shouldShowOnboarding, startOnboarding, skipOnboarding } = useOnboarding();

  if (!shouldShowOnboarding()) return null;

  return (
    <div className="fixed inset-0 bg-surface-50 dark:bg-gray-950 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 max-w-lg w-full p-8 md:p-10 text-center">
        <Logo size={48} className="mx-auto mb-6" />

        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t('onboarding.welcome.title', 'Welcome to NasabLink')}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
          {t('onboarding.welcome.description',
            'A short tour covers building your tree, inviting relatives, and keeping your family data private. You can skip and return anytime from Settings.'
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={startOnboarding}
            className="px-6 py-2.5 bg-primary-800 hover:bg-primary-900 text-white font-medium transition-colors"
          >
            {t('onboarding.welcome.start', 'Start Tour')}
          </button>
          <button
            onClick={skipOnboarding}
            className="px-6 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors border border-gray-300 dark:border-gray-600"
          >
            {t('onboarding.welcome.skip', 'Skip Tour')}
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
          {t('onboarding.welcome.note', 'You can restart the tree tour anytime with the ? button on a tree you can edit')}
        </p>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
