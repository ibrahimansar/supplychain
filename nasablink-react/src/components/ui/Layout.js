import React from 'react';

/**
 * Layout components to prevent layout shift and improve perceived performance
 */

/**
 * Shared CRM-style shell: full viewport width with tight side padding
 * (Zoho CRM / Desk feel). Use on authenticated app pages — not marketing/legal.
 */
export const APP_SHELL =
  'w-full max-w-none mx-auto px-3 sm:px-4 lg:px-5 xl:px-6';

// Main page container with consistent spacing
export const PageContainer = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-slate-50 pt-20 ${className}`}>
      {children}
    </div>
  );
};

// Content wrapper — full-bleed by default for app surfaces
export const ContentWrapper = ({ children, className = '', maxWidth = 'max-w-none' }) => {
  return (
    <div className={`mx-auto w-full ${maxWidth} px-3 sm:px-4 lg:px-5 xl:px-6 ${className}`}>
      {children}
    </div>
  );
};

// Page header with title and subtitle
export const PageHeader = ({ 
  title, 
  subtitle, 
  actions, 
  className = '',
  titleClassName = '',
  subtitleClassName = ''
}) => {
  return (
    <div className={`flex items-start justify-between mb-6 min-h-[60px] ${className}`}>
      <div className="flex-1 min-w-0">
        <h1 className={`text-xl font-semibold text-gray-900 dark:text-white truncate ${titleClassName}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-xs text-gray-600 dark:text-gray-400 mt-1 ${subtitleClassName}`}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 ms-4 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

// Grid layout with consistent card sizing
export const GridLayout = ({ 
  children, 
  columns = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = 'gap-4',
  className = ''
}) => {
  const gridCols = `grid-cols-${columns.default} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl}`;
  return (
    <div className={`grid ${gridCols} ${gap} ${className}`}>
      {children}
    </div>
  );
};

// List container with consistent item spacing
export const ListContainer = ({ 
  children, 
  spacing = 'space-y-3',
  className = ''
}) => {
  return (
    <div className={`${spacing} ${className}`}>
      {children}
    </div>
  );
};

// Card wrapper with min-height
export const CardWrapper = ({ 
  children, 
  minHeight = 'min-h-card',
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${minHeight} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Section with consistent spacing
export const Section = ({ 
  title, 
  description,
  children,
  actions,
  className = ''
}) => {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 ms-4">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

// Empty state component
export const EmptyState = ({ 
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Icon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
        </div>
      )}
      {title && (
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

// Loading container with min-height
export const LoadingContainer = ({ 
  minHeight = 'min-h-loading',
  children,
  className = ''
}) => {
  return (
    <div className={`${minHeight} flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
};

// Tab panel with consistent sizing
export const TabPanel = ({ 
  children,
  value,
  activeValue,
  keepMounted = false,
  minHeight = 'min-h-[400px]',
  className = ''
}) => {
  const isActive = value === activeValue;
  
  if (!isActive && !keepMounted) {
    return null;
  }
  
  return (
    <div 
      className={`${minHeight} ${className} ${!isActive ? 'hidden' : ''}`}
      role="tabpanel"
      hidden={!isActive}
    >
      {children}
    </div>
  );
};

// Stagger children for entrance animations
export const StaggerContainer = ({ 
  children,
  staggerDelay = 50,
  className = ''
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div 
          style={{ 
            animationDelay: `${index * staggerDelay}ms`,
            animation: 'slideUp 300ms ease-out forwards',
            opacity: 0
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export default {
  PageContainer,
  ContentWrapper,
  PageHeader,
  GridLayout,
  ListContainer,
  CardWrapper,
  Section,
  EmptyState,
  LoadingContainer,
  TabPanel,
  StaggerContainer,
};
