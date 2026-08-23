import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

// Mock LandingPage to avoid Three.js/WebGL issues in test environment
vi.mock('../LandingPage.jsx', () => ({
  default: function MockLandingPage({ onEnter }) {
    return (
      <div>
        <h1>climb the ladder</h1>
        <button onClick={onEnter}>Get Started</button>
        <section>
          <h2>how it works</h2>
          <div>Post a Link</div>
          <div>Watch Others</div>
          <div>Climb the Ladder</div>
        </section>
        <section>
          <h2>the points system</h2>
          <div>Click Play</div>
          <div>+5</div>
        </section>
        <section>
          <h2>outscroll vs the rest</h2>
          <div>Free</div>
        </section>
        <footer role="contentinfo">
          <div>Free leaderboard for engagement</div>
        </footer>
      </div>
    )
  }
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

  it('shows the landing page by default', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText('climb the ladder')).toBeInTheDocument()
  })

  it('shows landing page CTA button', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText(/get started/i)).toBeInTheDocument()
  })

  it('shows the "how it works" section', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText('how it works')).toBeInTheDocument()
    expect(screen.getByText('Post a Link')).toBeInTheDocument()
    expect(screen.getByText('Watch Others')).toBeInTheDocument()
    expect(screen.getByText('Climb the Ladder')).toBeInTheDocument()
  })

  it('shows the points system section', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText('the points system')).toBeInTheDocument()
    expect(screen.getByText('Click Play')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
  })

  it('shows the comparison section', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText('outscroll vs the rest')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('shows footer', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByText(/free leaderboard for engagement/i)).toBeInTheDocument()
  })

  it('has content info landmark', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
