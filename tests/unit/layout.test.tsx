import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RootLayout, { metadata, viewport } from '@/app/layout'

describe('RootLayout', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    )
    
    expect(getByText('Test Content')).toBeInTheDocument()
  })

  it('applies Inter font class to body', () => {
    const { container } = render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>
    )
    
    const body = container.querySelector('body')
    expect(body).toHaveClass('__className_aaf875') // Inter font class (mocked)
  })

  it('sets correct html lang attribute', () => {
    const { container } = render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>
    )
    
    const html = container.querySelector('html')
    expect(html).toHaveAttribute('lang', 'en')
  })
})

describe('Metadata', () => {
  it('has correct title', () => {
    expect(metadata.title).toBe('VaikunthaPOS - ISKCON Temple POS System')
  })

  it('has correct description', () => {
    expect(metadata.description).toBe('Modern Point of Sale system for ISKCON Asansol Temple Gift & Book Store')
  })

  it('references correct manifest path', () => {
    expect(metadata.manifest).toBe('/manifest.json')
  })
})

describe('Viewport', () => {
  it('has correct viewport configuration', () => {
    expect(viewport).toEqual({
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
      themeColor: '#F97316',
    })
  })

  it('disables user scaling for PWA experience', () => {
    expect(viewport.userScalable).toBe(false)
  })

  it('uses temple saffron theme color', () => {
    expect(viewport.themeColor).toBe('#F97316')
  })
})