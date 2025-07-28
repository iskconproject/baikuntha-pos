# Project Structure

## Root Directory Organization
```
/
├── src/
│   ├── app/                    # Next.js App Router pages and layouts
│   ├── components/             # Reusable React components
│   ├── lib/                    # Core utilities and configurations
│   ├── services/               # Business logic and data services
│   ├── types/                  # TypeScript type definitions
│   └── hooks/                  # Custom React hooks
├── public/                     # Static assets and PWA manifest
├── tests/                      # Test files and utilities
├── docs/                       # Project documentation
└── drizzle/                    # Database migrations and schema
```

## App Router Structure (src/app/)
```
app/
├── (auth)/                     # Authentication route group
│   ├── login/                  # PIN-based login page
│   └── layout.tsx              # Auth layout wrapper
├── (dashboard)/                # Main application routes
│   ├── sales/                  # Sales transaction interface
│   ├── inventory/              # Product and category management
│   ├── reports/                # Analytics and reporting
│   ├── users/                  # User management (admin only)
│   └── layout.tsx              # Dashboard layout with navigation
├── api/                        # API route handlers
│   ├── auth/                   # Authentication endpoints
│   ├── products/               # Product CRUD operations
│   ├── transactions/           # Transaction processing
│   ├── users/                  # User management
│   ├── reports/                # Report generation
│   └── sync/                   # Data synchronization
├── globals.css                 # Global styles and Tailwind imports
├── layout.tsx                  # Root layout with PWA setup
└── page.tsx                    # Landing/redirect page
```

## Components Organization (src/components/)
```
components/
├── ui/                         # Base UI components (buttons, inputs, etc.)
├── forms/                      # Form components with validation
├── layout/                     # Layout components (header, sidebar, etc.)
├── sales/                      # Sales-specific components
├── inventory/                  # Inventory management components
├── reports/                    # Reporting and analytics components
├── auth/                       # Authentication components
└── common/                     # Shared utility components
```

## Services Layer (src/services/)
```
services/
├── database/                   # Database connection and operations
│   ├── local.ts               # SQLite local database service
│   ├── cloud.ts               # Turso cloud database service
│   └── sync.ts                # Synchronization service
├── auth/                       # Authentication services
├── products/                   # Product management services
├── transactions/               # Transaction processing services
├── search/                     # Search engine and indexing
├── reports/                    # Report generation services
└── printer/                    # Thermal printer integration
```

## Library Organization (src/lib/)
```
lib/
├── db/                         # Database schema and migrations
│   ├── schema.ts              # Drizzle schema definitions
│   ├── migrations/            # Database migration files
│   └── seed.ts                # Initial data seeding
├── auth/                       # Authentication utilities
├── validation/                 # Zod schemas for validation
├── utils/                      # General utility functions
├── constants/                  # Application constants
└── config/                     # Configuration files
```

## Testing Structure (tests/)
```
tests/
├── unit/                       # Vitest unit tests
├── integration/                # Vitest integration tests
├── e2e/                        # Playwright end-to-end tests
├── fixtures/                   # Test data and mocks
└── utils/                      # Testing utilities and helpers
```

## Key File Naming Conventions
- **Pages**: Use folder structure with `page.tsx` for routes
- **Components**: PascalCase for component files (e.g., `ProductCard.tsx`)
- **Services**: camelCase for service files (e.g., `productService.ts`)
- **Types**: PascalCase for type files (e.g., `ProductTypes.ts`)
- **Hooks**: camelCase starting with "use" (e.g., `useAuth.ts`)
- **Utils**: camelCase for utility files (e.g., `formatCurrency.ts`)

## Import Organization
```typescript
// 1. External libraries
import React from 'react';
import { NextRequest } from 'next/server';

// 2. Internal services and utilities
import { productService } from '@/services/products';
import { formatCurrency } from '@/lib/utils';

// 3. Components
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/inventory/ProductCard';

// 4. Types
import type { Product, User } from '@/types';
```

## Configuration Files Location
- **Database**: `src/lib/db/schema.ts` and `drizzle.config.ts`
- **PWA**: `next.config.js` with next-pwa configuration
- **Tailwind**: `tailwind.config.js` with custom temple theme
- **TypeScript**: `tsconfig.json` with path aliases
- **Testing**: `vitest.config.ts` and `playwright.config.ts`
- **Environment**: `.env.local` for local development variables

## Asset Organization (public/)
```
public/
├── icons/                      # PWA icons and favicons
├── images/                     # Static images and logos
├── manifest.json               # PWA manifest file
└── sw.js                       # Service worker (generated)
```

## Path Aliases (tsconfig.json)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/services/*": ["./src/services/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"]
    }
  }
}
```