'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
  if (direction === 'up') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
  }
  
  if (direction === 'down') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    );
  }
  
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
    </svg>
  );
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
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <Card variant="elevated" className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardHeader className={sizeClasses[size]}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className={cn('p-2 rounded-lg', iconColorClasses[iconColor])}>
                <Icon className={cn('flex-shrink-0', size === 'lg' ? 'h-8 w-8' : 'h-6 w-6')} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                'font-semibold text-gray-900 truncate',
                size === 'lg' ? 'text-xl' : size === 'md' ? 'text-lg' : 'text-base'
              )}>
                {title}
              </h3>
              {description && (
                <p className={cn(
                  'text-gray-600 mt-1',
                  size === 'lg' ? 'text-base' : 'text-sm'
                )}>
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {status && (
            <div className="flex items-center space-x-2">
              <div className={cn('h-2 w-2 rounded-full', statusClasses[status.type])} />
              <span className={cn(
                'font-medium',
                size === 'lg' ? 'text-sm' : 'text-xs',
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
      </CardHeader>
      
      <CardContent className={cn('pt-0', sizeClasses[size])}>
        {value !== undefined && (
          <div className="mb-4">
            <div className={cn(
              'font-bold text-gray-900',
              size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl'
            )}>
              {value}
            </div>
            {subValue && (
              <div className={cn(
                'text-gray-600 mt-1',
                size === 'lg' ? 'text-base' : 'text-sm'
              )}>
                {subValue}
              </div>
            )}
            {trend && (
              <div className={cn(
                'flex items-center space-x-1 mt-2',
                trendClasses[trend.direction]
              )}>
                <TrendIcon direction={trend.direction} />
                <span className={cn(
                  'font-medium',
                  size === 'lg' ? 'text-sm' : 'text-xs'
                )}>
                  {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
                </span>
              </div>
            )}
          </div>
        )}
        
        {children && (
          <div className="mb-4">
            {children}
          </div>
        )}
        
        {action && (
          <div className="mt-4">
            {action.href ? (
              <Button
                as="a"
                href={action.href}
                variant="primary"
                size="sm"
                className="w-full"
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ) : (
              <Button
                onClick={action.onClick}
                variant="primary"
                size="sm"
                className="w-full"
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};