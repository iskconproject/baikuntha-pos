'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
// Simple SVG icons to replace lucide-react
const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const MinusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

interface DashboardWidgetProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  value?: string | number;
  subValue?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
  };
  status?: {
    label: string;
    type: 'success' | 'warning' | 'error' | 'info';
  };
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const iconColorClasses = {
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  error: 'bg-error-100 text-error-600',
  info: 'bg-blue-100 text-blue-600',
  gray: 'bg-gray-100 text-gray-600',
};

const statusClasses = {
  success: 'bg-success-500 text-success-600',
  warning: 'bg-warning-500 text-warning-600',
  error: 'bg-error-500 text-error-600',
  info: 'bg-blue-500 text-blue-600',
};

const trendClasses = {
  up: 'text-success-600',
  down: 'text-error-600',
  neutral: 'text-gray-600',
};

const TrendIcon: React.FC<{ direction: 'up' | 'down' | 'neutral' }> = ({ direction }) => {
  const iconProps = { className: "h-4 w-4" };
  
  switch (direction) {
    case 'up':
      return <TrendingUpIcon {...iconProps} />;
    case 'down':
      return <TrendingDownIcon {...iconProps} />;
    default:
      return <MinusIcon {...iconProps} />;
  }
};

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'primary',
  value,
  subValue,
  trend,
  action,
  status,
  children,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  // Determine card type for consistent layout
  const isMetricCard = value !== undefined;
  const isActionCard = action !== undefined;

  return (
    <Card 
      variant="elevated" 
      padding="none"
      className={cn(
        'hover:shadow-lg transition-shadow h-full flex flex-col', 
        className
      )}
    >
      {/* Header Section - Fixed height for consistency */}
      <CardHeader className={cn('flex-shrink-0', sizeClasses[size])}>
        <div className="flex flex-col min-h-[60px]">
          {/* Title Row */}
          <div className="flex items-center space-x-3 mb-2">
            {Icon && (
              <div className={cn('p-2 rounded-lg flex-shrink-0', iconColorClasses[iconColor])}>
                <Icon className={cn('flex-shrink-0', size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                'font-semibold text-gray-900 leading-tight',
                size === 'lg' ? 'text-base' : 'text-sm'
              )}>
                {title}
              </h3>
            </div>
          </div>
          
          {/* Status Row - Always reserve space */}
          <div className={cn('min-h-[16px] flex items-center', Icon ? 'ml-11' : '')}>
            {status && (
              <div className="flex items-center space-x-2">
                <div className={cn('h-2 w-2 rounded-full', statusClasses[status.type])} />
                <span className={cn(
                  'font-medium text-xs',
                  status.type === 'success' ? 'text-success-600' :
                  status.type === 'warning' ? 'text-warning-600' :
                  status.type === 'error' ? 'text-error-600' :
                  'text-blue-600'
                )}>
                  {status.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      {/* Content Section - Flexible height */}
      <CardContent className={cn('pt-0 flex-1 flex flex-col', sizeClasses[size])}>
        <div className="flex-1 flex flex-col justify-between">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Metric Display */}
            {isMetricCard && (
              <div className="mb-3">
                <div className={cn(
                  'font-bold text-gray-900 leading-tight',
                  size === 'lg' ? 'text-2xl' : 'text-xl'
                )}>
                  {value}
                </div>
                {subValue && (
                  <div className="text-gray-600 text-xs mt-1 leading-tight">
                    {subValue}
                  </div>
                )}
                {trend && (
                  <div className={cn(
                    'flex items-center space-x-1 mt-2',
                    trendClasses[trend.direction]
                  )}>
                    <TrendIcon direction={trend.direction} />
                    <span className="font-medium text-xs">
                      {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Description for Action Cards */}
            {isActionCard && description && (
              <div className="mb-3">
                <p className={cn(
                  'text-gray-600 text-xs leading-relaxed',
                  Icon ? 'ml-11' : ''
                )}>
                  {description}
                </p>
              </div>
            )}
            
            {/* Custom Children Content */}
            {children && (
              <div className="mb-3">
                {children}
              </div>
            )}
          </div>
          
          {/* Action Button - Always at bottom */}
          {action && (
            <div className="mt-auto">
              {action.href ? (
                <a
                  href={action.href}
                  className={cn(
                    'inline-flex items-center justify-center rounded-lg font-medium w-full',
                    'transition-all duration-200 ease-in-out',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'touch-manipulation min-h-[36px] px-3 py-2 text-sm gap-2',
                    'bg-primary-600 text-white shadow-sm',
                    'hover:bg-primary-700 active:bg-primary-800',
                    'focus:ring-primary-500',
                    action.disabled && 'pointer-events-none opacity-50'
                  )}
                  role="button"
                  aria-disabled={action.disabled}
                >
                  {action.label}
                </a>
              ) : (
                <Button
                  onClick={action.onClick}
                  variant="primary"
                  size="sm"
                  className="w-full min-h-[36px]"
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};