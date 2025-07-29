'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect to role-specific dashboard
      const dashboardPath = getDashboardPath(user.role);
      router.replace(dashboardPath);
    }
  }, [user, isLoading, router]);

  // Show loading state
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saffron-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

/**
 * Get dashboard path based on user role
 */
function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'manager':
      return '/dashboard/manager';
    case 'cashier':
      return '/dashboard/cashier';
    default:
      return '/dashboard/cashier'; // Default to cashier for unknown roles
  }
}