'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface MetricData {
  id: string;
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

interface MetricsOverviewProps {
  metrics: MetricData[];
  className?: string;
  layout?: 'horizontal' | 'grid';
}

const colorClasses = {
  blue: 'bg-blue-500 text-blue-600',
  green: 'bg-green-500 text-green-600', 
  yellow: 'bg-yellow-500 text-yellow-600',
  red: 'bg-red-500 text-red-600',
  purple: 'bg-purple-500 text-purple-600',
  gray: 'bg-gray-500 text-gray-600',
};

export function MetricsOverview({ 
  metrics, 
  className,
  layout = 'grid' 
}: MetricsOverviewProps) {
  return (
    <div className={cn(
      layout === 'grid' 
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
        : 'flex flex-wrap gap-4',
      className
    )}>
      {metrics.map((metric) => (
        <Card key={metric.id} variant="elevated" className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {metric.title}
                </p>
                <p className={cn(
                  'font-bold text-gray-900',
                  metric.size === 'lg' ? 'text-3xl' : 
                  metric.size === 'sm' ? 'text-xl' : 'text-2xl'
                )}>
                  {metric.value}
                </p>
                {metric.change && (
                  <div className={cn(
                    'flex items-center mt-2 text-sm',
                    metric.change.direction === 'up' ? 'text-green-600' :
                    metric.change.direction === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  )}>
                    <span className="font-medium">
                      {metric.change.direction === 'up' ? '+' : ''}
                      {metric.change.value}%
                    </span>
                    <span className="ml-1 text-gray-500">
                      {metric.change.period}
                    </span>
                  </div>
                )}
              </div>
              {metric.icon && (
                <div className={cn(
                  'p-3 rounded-full bg-opacity-10',
                  colorClasses[metric.color || 'blue']
                )}>
                  <metric.icon className="h-6 w-6" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}