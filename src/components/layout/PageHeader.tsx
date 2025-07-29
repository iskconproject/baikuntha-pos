'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}) => {
  return (
    <div className={cn(
      'mb-6 sm:mb-8',
      className
    )}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="h-4 w-4 text-gray-400 mx-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-900 font-medium">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header content */}
      <div className={cn(
        'flex flex-col gap-4',
        // Responsive layout
        'sm:flex-row sm:items-center sm:justify-between'
      )}>
        {/* Title and description */}
        <div className="min-w-0 flex-1">
          <h1 className={cn(
            'font-bold text-gray-900 truncate',
            // Responsive text sizing
            'text-2xl sm:text-3xl lg:text-4xl'
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              'text-gray-600 mt-2',
              // Responsive text sizing
              'text-sm sm:text-base lg:text-lg'
            )}>
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className={cn(
            'flex-shrink-0',
            // Responsive action layout
            'flex flex-col gap-2 sm:flex-row sm:gap-3'
          )}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};