import React, { createContext, useContext, useState, useEffect } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

const ONBOARDING_STORAGE_KEY = 'nasablink-onboarding-status';

/** Slide count for the intro ProductTour (INTRO_TOUR_SLIDES). */
const INTRO_SLIDE_COUNT = 4;

const OnboardingProvider = ({ children }) => {
  const [onboardingStatus, setOnboardingStatus] = useState(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        completed: false,
        skipped: false,
        currentStep: 0,
        completedSteps: [],
      };
    } catch {
      return {
        completed: false,
        skipped: false,
        currentStep: 0,
        completedSteps: [],
      };
    }
  });

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingStatus));
  }, [onboardingStatus]);

  const startOnboarding = () => {
    setOnboardingStatus({
      completed: false,
      skipped: false,
      currentStep: 0,
      completedSteps: [],
    });
    setIsActive(true);
  };

  const skipOnboarding = () => {
    setOnboardingStatus((prev) => ({
      ...prev,
      skipped: true,
      completed: true,
    }));
    setIsActive(false);
  };

  const resetOnboarding = () => {
    setOnboardingStatus({
      completed: false,
      skipped: false,
      currentStep: 0,
      completedSteps: [],
    });
    setIsActive(false);
  };

  const shouldShowOnboarding = () => !onboardingStatus.completed && !onboardingStatus.skipped;

  const value = {
    onboardingStatus,
    isActive,
    startOnboarding,
    skipOnboarding,
    resetOnboarding,
    shouldShowOnboarding,
    totalSteps: INTRO_SLIDE_COUNT,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export { OnboardingProvider };
