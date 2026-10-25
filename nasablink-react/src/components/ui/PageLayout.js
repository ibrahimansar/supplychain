import React from 'react';

/**
 * PageLayout - Unified page wrapper component for consistent styling
 * 
 * Usage:
 *   <PageLayout>content</PageLayout>
 *   <PageLayout variant="gradient">content</PageLayout>
 *   <PageLayout noPadding>content</PageLayout>
 */
const PageLayout = ({ 
  children, 
  variant = 'default', // 'default' | 'gradient' | 'plain'
  className = '',
  noPadding = false,
  centered = false,
  maxWidth = null // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}) => {
  const baseClasses = 'min-h-screen';
  
  const variantClasses = {
    default: 'bg-slate-50',
    gradient: 'bg-gradient-to-br from-slate-50 via-white to-teal-50/40',
    plain: 'bg-white'
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-none',
    app: 'max-w-none',
  };

  const paddingClasses = noPadding
    ? ''
    : maxWidth === 'app' || maxWidth === 'full'
      ? 'pt-20 px-3 sm:px-4 lg:px-5 xl:px-6 pb-8'
      : 'pt-20 px-4 pb-8';

  const centeredClasses = centered ? 'flex items-center justify-center' : '';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses} ${centeredClasses} ${className}`}>
      {maxWidth ? (
        <div className={`${maxWidthClasses[maxWidth]} mx-auto w-full`}>
          {children}
        </div>
      ) : children}
    </div>
  );
};

/**
 * PageHeader - Consistent page header with title and optional subtitle
 */
export const PageHeader = ({ 
  title, 
  subtitle, 
  action,
  className = '' 
}) => (
  <div className={`mb-6 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  </div>
);

/**
 * PageSection - Consistent section wrapper within pages
 */
export const PageSection = ({ 
  title, 
  description, 
  children, 
  className = '' 
}) => (
  <section className={`mb-8 ${className}`}>
    {(title || description) && (
      <div className="mb-4">
        {title && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    )}
    {children}
  </section>
);

export default PageLayout;
