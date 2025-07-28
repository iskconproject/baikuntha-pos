# VaikunthaPOS - ISKCON Temple POS System

A modern Progressive Web App (PWA) Point of Sale system designed specifically for ISKCON Asansol Temple's Gift & Book Store.

## Features

- 🏪 **Offline-First**: Works without internet connectivity
- 📱 **Multi-Device**: Supports phones, tablets, and computers
- 🔐 **Secure Authentication**: PIN-based authentication with role-based access
- 🔍 **Advanced Search**: Multi-language search with keywords and metadata
- 🧾 **Receipt Printing**: Thermal printer integration with PDF fallback
- 📊 **Real-time Sync**: Automatic data synchronization across devices
- 🎨 **Temple Theme**: Custom saffron/temple-themed UI design

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom temple theme
- **Database**: SQLite (local) + Turso LibSQL (cloud)
- **ORM**: Drizzle ORM
- **State Management**: Zustand
- **Testing**: Vitest + Playwright
- **PWA**: next-pwa with service worker

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

### Database
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Drizzle Studio

### Testing
- `npm run test` - Run Vitest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:coverage` - Generate test coverage report

### PWA & Build
- `npm run build:analyze` - Analyze bundle size
- `npm run pwa:install` - Test PWA installation

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
├── components/             # Reusable React components
├── lib/                    # Core utilities and configurations
├── services/               # Business logic and data services
├── types/                  # TypeScript type definitions
└── hooks/                  # Custom React hooks
```

## User Roles

- **Admin**: Full system access including user management
- **Manager**: Sales, inventory, and reports access
- **Cashier**: Sales transactions only

## Development Status

✅ **Task 1 Complete**: Project foundation and core infrastructure
- Next.js 14 project with TypeScript
- Tailwind CSS with custom temple/saffron theme
- PWA configuration with next-pwa
- Vitest testing setup
- Basic project structure

## License

This project is developed for ISKCON Asansol Temple.

## Support

For support and questions, please contact the temple administration.