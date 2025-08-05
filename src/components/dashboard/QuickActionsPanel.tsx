'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  badge?: string | number;
  disabled?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface QuickActionsPanelProps {
  actions: QuickAction[];
  title?: string;
  className?: string;
  layout?: 'grid' | 'list';
  showPriority?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
  red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  gray: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
};

const priorityOrder = { high: 0, medium: 1, low: 2 };

export function QuickActionsPanel({ 
  actions, 
  title = "Quick Actions",
  className,
  layout = 'grid',
  showPriority = false 
}: QuickActionsPanelProps) {
  const sortedActions = showPriority 
    ? [...actions].sort((a, b) => 
        priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']
      )
    : actions;

  const ActionButton: React.FC<{ action: QuickAction }> = ({ action }) => {
    const Component = action.href ? 'a' : 'button';
    const props = action.href 
      ? { href: action.href }
      : { onClick: action.onClick };

    return (
      <Component
        {...props}
        className={cn(
          'group relative p-4 rounded-lg border-2 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          colorClasses[action.color || 'gray'],
          action.disabled && 'pointer-events-none opacity-50',
          layout === 'list' && 'flex items-center space-x-4'
        )}
        disabled={action.disabled}
      >
        <div className={cn(
          'flex items-center',
          layout === 'grid' ? 'flex-col text-center space-y-3' : 'space-x-4'
        )}>
          <div className="relative">
            <action.icon className={cn(
              'transition-transform group-hover:scale-110',
              layout === 'grid' ? 'h-8 w-8' : 'h-6 w-6'
            )} />
            {action.badge && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {action.badge}
              </span>
            )}
          </div>
          <div className={cn(layout === 'list' && 'flex-1')}>
            <h3 className={cn(
              'font-semibold',
              layout === 'grid' ? 'text-sm' : 'text-base'
            )}>
              {action.title}
            </h3>
            {action.description && (
              <p className={cn(
                'text-gray-600 mt-1',
                layout === 'grid' ? 'text-xs' : 'text-sm'
              )}>
                {action.description}
              </p>
            )}
          </div>
        </div>
        
        {showPriority && action.priority === 'high' && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        )}
      </Component>
    );
  };

  return (
    <Card variant="elevated" className={className}>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </CardHeader>
      <CardContent>
        <div className={cn(
          layout === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-3'
        )}>
          {sortedActions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}