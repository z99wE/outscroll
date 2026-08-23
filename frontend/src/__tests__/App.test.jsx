import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import App from '../App.jsx'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { user: null } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockReturnThis(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })

  it('renders the logo in header and footer', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    const logos = screen.getAllByText('out')
    expect(logos.length).toBeGreaterThanOrEqual(2) // header + footer
  })

  it('renders navigation landmarks', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders navigation with correct items', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
    expect(screen.getByText('Feed')).toBeInTheDocument()
    expect(screen.getByText('Ranks')).toBeInTheDocument()
  })

  it('shows loading state for feed', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    // Feed shows loading skeletons while data is being fetched
    const loadingElements = document.querySelectorAll('.loading-pulse')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('has skip-to-content link', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText('Skip to content')).toBeInTheDocument()
  })

  it('has OutScroll home button with aria-label', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByRole('button', { name: /outscroll home/i })).toBeInTheDocument()
  })

  it('renders footer with tagline', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText(/free leaderboard for engagement/i)).toBeInTheDocument()
  })
})
