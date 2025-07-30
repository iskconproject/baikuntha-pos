"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badge?: string | number;
}

interface NavigationProps {
  userRole?: string;
  className?: string;
}

// Navigation icons
const SalesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h9.1M6 18a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4z"
    />
  </svg>
);

const InventoryIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const ReportsIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const CatalogIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const navigationItems: NavigationItem[] = [
  {
    name: "Sales",
    href: "/sales",
    icon: SalesIcon,
    roles: ["admin", "manager", "cashier"],
  },
  {
    name: "Catalog",
    href: "/catalog",
    icon: CatalogIcon,
    roles: ["admin", "manager", "cashier"],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: InventoryIcon,
    roles: ["admin", "manager"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: ReportsIcon,
    roles: ["admin", "manager"],
  },
  {
    name: "Users",
    href: "/users",
    icon: UsersIcon,
    roles: ["admin"],
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  userRole = "cashier",
  className,
}) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter navigation items based on user role
  const filteredItems = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isMobileMenuOpen]);

  const NavigationLink: React.FC<{
    item: NavigationItem;
    mobile?: boolean;
  }> = ({ item, mobile = false }) => {
    const isActive = pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={cn(
          // Base styles
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          // Touch optimization
          mobile && "min-h-[48px] px-4 py-3",
          // Active state
          isActive && [
            "bg-primary-100 text-primary-700",
            "shadow-sm border border-primary-200",
          ],
          // Inactive state
          !isActive && [
            "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            "focus:bg-gray-100 focus:text-gray-900",
          ],
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          // Mobile specific styles
          mobile && "text-base"
        )}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon
          className={cn(
            "flex-shrink-0",
            mobile ? "h-6 w-6" : "h-5 w-5",
            isActive
              ? "text-primary-600"
              : "text-gray-500 group-hover:text-gray-700"
          )}
        />
        <span className="truncate">{item.name}</span>
        {item.badge && (
          <span
            className={cn(
              "ml-auto inline-flex items-center justify-center rounded-full text-xs font-medium",
              "min-w-[20px] h-5 px-2",
              isActive
                ? "bg-primary-200 text-primary-800"
                : "bg-gray-200 text-gray-700"
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={cn(
          "hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0",
          "bg-white border-r border-gray-200",
          className
        )}
      >
        {/* Logo/Brand */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VP</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">VaikunthaPOS</h1>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {filteredItems.map((item) => (
            <NavigationLink key={item.href} item={item} />
          ))}
        </div>

        {/* User info / logout */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VP</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">VaikunthaPOS</h1>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              "inline-flex items-center justify-center p-2 rounded-lg",
              "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
              "transition-colors duration-200",
              // Touch optimization
              "min-h-[44px] min-w-[44px]"
            )}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <div
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">VP</span>
                    </div>
                    <div>
                      <h2
                        id="mobile-menu-title"
                        className="text-lg font-bold text-gray-900"
                      >
                        Menu
                      </h2>
                      <p className="text-sm text-gray-500 capitalize">
                        {userRole}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    aria-label="Close menu"
                  >
                    <CloseIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                  {filteredItems.map((item) => (
                    <NavigationLink key={item.href} item={item} mobile />
                  ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors min-h-[48px]">
                    <svg
                      className="h-6 w-6 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
