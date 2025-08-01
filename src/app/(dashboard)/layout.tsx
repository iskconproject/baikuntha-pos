'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SessionTimeoutWarning } from '@/components/auth/SessionTimeoutWarning';
import { UserProfile } from '@/components/auth/UserProfile';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout, refreshAuth, timeUntilLogout } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-saffron-600">
                  BaikunthaPOS
                </h1>
              </div>
              
              {/* Role-based Navigation Menu */}
              <nav className="hidden md:flex space-x-6">
                <Link 
                  href="/dashboard" 
                  className="text-gray-700 hover:text-saffron-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/sales" 
                  className="text-gray-700 hover:text-saffron-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sales
                </Link>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <>
                    <Link 
                      href="/inventory" 
                      className="text-gray-700 hover:text-saffron-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Inventory
                    </Link>
                    <Link 
                      href="/reports" 
                      className="text-gray-700 hover:text-saffron-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Reports
                    </Link>
                  </>
                )}
                {user.role === 'admin' && (
                  <Link 
                    href="/users" 
                    className="text-gray-700 hover:text-saffron-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Users
                  </Link>
                )}
              </nav>
            </div>

            {/* User Profile */}
            <div className="flex items-center">
              <UserProfile
                user={user}
                onLogout={logout}
                timeUntilLogout={timeUntilLogout}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        timeUntilLogout={timeUntilLogout}
        onExtendSession={refreshAuth}
        onLogout={logout}
        warningThreshold={300} // 5 minutes
      />
    </div>
  );
}