"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { AuthUser } from "@/types/auth";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  user: AuthUser;
  onLogout: () => void;
  timeUntilLogout?: number | null;
  className?: string;
}

interface UserProfileModalProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  timeUntilLogout?: number | null;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onLogout,
  timeUntilLogout,
  className,
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "manager":
        return "Manager";
      case "cashier":
        return "Cashier";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case "admin":
        return "bg-error-100 text-error-800";
      case "manager":
        return "bg-warning-100 text-warning-800";
      case "cashier":
        return "bg-success-100 text-success-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <>
      {/* User Profile Button */}
      <button
        onClick={() => setShowProfileModal(true)}
        className={cn(
          "flex items-center space-x-3 p-2 rounded-lg transition-colors",
          "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500",
          "min-h-[44px] w-full text-left",
          className
        )}
        aria-label="Open user profile"
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.username}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {getRoleDisplayName(user.role)}
          </p>
        </div>

        {/* Session Timer (if available) */}
        {timeUntilLogout && timeUntilLogout > 0 && (
          <div className="flex-shrink-0">
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full font-mono",
                timeUntilLogout <= 300 // 5 minutes
                  ? "bg-warning-100 text-warning-800"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {formatTime(timeUntilLogout)}
            </span>
          </div>
        )}

        {/* Chevron */}
        <div className="flex-shrink-0">
          <svg
            className="h-4 w-4 text-gray-400"
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
        </div>
      </button>

      {/* Profile Modal */}
      <UserProfileModal
        user={user}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onLogout={onLogout}
        timeUntilLogout={timeUntilLogout}
      />
    </>
  );
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onLogout,
  timeUntilLogout,
}) => {
  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "manager":
        return "Manager";
      case "cashier":
        return "Cashier";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case "admin":
        return "bg-error-100 text-error-800";
      case "manager":
        return "bg-warning-100 text-warning-800";
      case "cashier":
        return "bg-success-100 text-success-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${remainingSeconds}s`;
  };

  const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) {
      return "Never";
    }

    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return "Invalid date";
    }

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }

    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dateObj);
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile" size="sm">
      <div className="space-y-6">
        {/* User Avatar and Basic Info */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {user.username}
          </h3>
          <span
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2",
              getRoleColor(user.role)
            )}
          >
            {getRoleDisplayName(user.role)}
          </span>
        </div>

        {/* User Details */}
        <Card variant="outlined" padding="sm">
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="text-sm text-gray-900 font-mono">
                  {user.username}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="text-sm text-gray-900">
                  {getRoleDisplayName(user.role)}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Account Status
                </dt>
                <dd className="text-sm">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      user.isActive
                        ? "bg-success-100 text-success-800"
                        : "bg-error-100 text-error-800"
                    )}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Last Login
                </dt>
                <dd className="text-sm text-gray-900">
                  {formatDateTime(user.lastLoginAt)}
                </dd>
              </div>

              {timeUntilLogout && timeUntilLogout > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Session Expires In
                  </dt>
                  <dd className="text-sm">
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        timeUntilLogout <= 300 // 5 minutes
                          ? "text-warning-600"
                          : "text-gray-900"
                      )}
                    >
                      {formatTime(timeUntilLogout)}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Session Warning */}
        {timeUntilLogout && timeUntilLogout <= 300 && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-warning-50 border border-warning-200">
            <svg
              className="h-5 w-5 text-warning-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span className="text-sm text-warning-700">
              Your session will expire soon. Any activity will extend your
              session.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={handleLogout}
            className="flex-1"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </Modal>
  );
};
