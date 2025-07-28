import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import React from 'react'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js image component
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', props)
  },
}))

// Mock Next.js fonts
vi.mock('next/font/google', () => ({
  Inter: () => ({
    className: '__className_aaf875',
  }),
}))



// Mock environment variables - handled by vitest automatically

// Setup and cleanup
beforeAll(() => {
  // Global test setup
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  // Global test cleanup
})