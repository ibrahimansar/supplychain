import React from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import ProductTour, { INTRO_TOUR_SLIDES } from './ProductTour';

/**
 * Introduction tour — fixed slide modal (no live DOM targeting).
 */
const OnboardingTooltip = () => {
  const { isActive, skipOnboarding } = useOnboarding();

  const finish = () => skipOnboarding();

  return (
    <ProductTour
      isOpen={isActive}
      onClose={finish}
      onSkip={finish}
      slides={INTRO_TOUR_SLIDES}
      title="Introduction"
    />
  );
};

export default OnboardingTooltip;
