# Technology Stack

## Framework & Runtime

- **Next.js 14** with App Router for full-stack React application
- **TypeScript** for type safety and better developer experience
- **React 18** for UI components and state management
- **Node.js** runtime environment

## Database & ORM

- **SQLite** (better-sqlite3) for local offline database
- **Turso LibSQL** for cloud database and multi-device sync
- **Drizzle ORM** for type-safe database operations and migrations
- **SQLite FTS5** for full-text search capabilities

## Styling & UI

- **Tailwind CSS** for utility-first styling with custom temple/saffron theme
- **Touch-optimized components** for mobile and tablet interfaces
- **Responsive design** with mobile-first approach

## State Management & Data

- **Zustand** for client-side state management (shopping cart, UI state)
- **React Query/TanStack Query** for server state management and caching
- **Zod** for runtime type validation and form schemas

## PWA & Offline

- **next-pwa** for Progressive Web App configuration
- **Service Worker** for offline caching and background sync
- **Web USB API** for thermal printer integration
- **Push Notifications** for sync status updates

## Testing

- **Vitest** for unit and integration testing
- **Playwright** for end-to-end testing
- **React Testing Library** for component testing

## Authentication & Security

- **bcryptjs** for PIN hashing
- **JWT-like tokens** in secure HTTP-only cookies
- **Role-based access control** middleware

## Common Commands

### Development

```bash
pnpm dev             # Start development server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint
pnpm type-check      # Run TypeScript compiler check
```

### Database

```bash
pnpm db:generate     # Generate Drizzle migrations
pnpm db:migrate      # Run database migrations
pnpm db:seed         # Seed database with initial data
pnpm db:studio       # Open Drizzle Studio for database management
```

### Testing

```bash
pnpm test            # Run Vitest unit tests
pnpm test:watch      # Run tests in watch mode
pnpm test:ui         # Open Vitest UI
pnpm test:e2e        # Run Playwright E2E tests
pnpm test:coverage   # Generate test coverage report
```

### PWA & Build

```bash
pnpm build:analyze   # Analyze bundle size
pnpm pwa:install     # Test PWA installation
pnpm sw:update       # Update service worker
```

## Architecture Patterns

- **Offline-first architecture** with local SQLite as primary data store
- **Dual-database sync** pattern for local/cloud data consistency
- **Service layer pattern** for business logic separation
- **Repository pattern** for data access abstraction
- **Error boundary pattern** for React error handling
- **Queue pattern** for offline operation management
