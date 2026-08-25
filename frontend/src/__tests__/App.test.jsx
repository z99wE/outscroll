import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'

/* ── Global mocks ──────────────────────────────────────────── */

Object.defineProperty(window, 'matchMedia', {
  writable: true, configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
})

vi.mock('axios', () => {
  const m = {
    get: vi.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/videos/feed')) return Promise.resolve({ data: { videos: [] } })
      if (typeof url === 'string' && url.includes('/leaderboard')) return Promise.resolve({ data: { leaderboard: [] } })
      if (typeof url === 'string' && url.includes('/notifications')) return Promise.resolve({ data: { notifications: [], unread_count: 0 } })
      if (typeof url === 'string' && url.includes('/me')) return Promise.resolve({ data: { user: null } })
      if (typeof url === 'string' && url.includes('/donations')) return Promise.resolve({ data: { enabled: false, kofi: '', bmc: '' } })
      if (typeof url === 'string' && url.includes('/admin/')) return Promise.resolve({ data: {} })
      return Promise.resolve({ data: { user: null } })
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    create: vi.fn().mockReturnThis(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  }
  return { default: m }
})

vi.mock('../LandingPage.jsx', () => ({
  default: ({ onEnter }) => (
    <div>
      <h1>climb the ladder</h1>
      <button onClick={onEnter}>Get Started</button>
      <section><h2>how it works</h2><div>Post a Link</div><div>Watch Others</div><div>Climb the Ladder</div></section>
      <section><h2>the points system</h2><div>Click Play</div><div>+5</div></section>
      <section><h2>outscroll vs the rest</h2><div>Free</div></section>
      <footer role="contentinfo"><div>Free leaderboard for engagement</div></footer>
    </div>
  )
}))
vi.mock('../PWAInstallBanner.jsx', () => ({ default: () => null }))
vi.mock('../CookieConsent.jsx', () => ({ default: () => null }))
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ children }) => <div data-testid="virtuoso">{typeof children === 'function' ? children(0) : children}</div>,
}))

import axios from 'axios'
import App from '../App.jsx'

/* ── Helpers ───────────────────────────────────────────────── */

async function renderAndEnter() {
  localStorage.clear()
  render(<StrictMode><App /></StrictMode>)
  await waitFor(() => expect(screen.getByText('climb the ladder')).toBeInTheDocument())
  await act(async () => { fireEvent.click(screen.getByText('Get Started')) })
  await waitFor(() => expect(screen.queryByText('climb the ladder')).not.toBeInTheDocument())
  await waitFor(() => expect(screen.getAllByText('Feed').length).toBeGreaterThan(0))
}

/** Find a nav BUTTON by text — uses within the header banner to avoid duplicates */
function navBtn(name) {
  const banner = screen.getByRole('banner')
  const btns = within(banner).getAllByText(name).filter(el => el.tagName === 'BUTTON')
  return btns[0]
}

/** Find a footer button by text — uses within contentinfo landmark */
function footerBtn(name) {
  const footer = screen.getByRole('contentinfo')
  return within(footer).getAllByText(name).find(el => el.tagName === 'BUTTON')
}

/* ── Tests ─────────────────────────────────────────────────── */

describe('App', () => {

  describe('Landing page', () => {
    it('renders without crashing', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>) })
    it('shows landing page by default', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>); expect(screen.getByText('climb the ladder')).toBeInTheDocument() })
    it('shows CTA button', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>); expect(screen.getByText(/get started/i)).toBeInTheDocument() })
    it('shows how it works', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>); expect(screen.getByText('how it works')).toBeInTheDocument() })
    it('shows points system', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>); expect(screen.getByText('the points system')).toBeInTheDocument() })
    it('shows comparison', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>); expect(screen.getByText('outscroll vs the rest')).toBeInTheDocument() })
    it('shows footer', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>); expect(screen.getByText(/free leaderboard for engagement/i)).toBeInTheDocument() })
    it('has contentinfo landmark', () => { localStorage.clear(); render(<StrictMode><App /></StrictMode>); expect(screen.getByRole('contentinfo')).toBeInTheDocument() })
    it('navigates to app on click', async () => {
      localStorage.clear(); render(<StrictMode><App /></StrictMode>)
      await waitFor(() => expect(screen.getByText('climb the ladder')).toBeInTheDocument())
      await act(async () => { fireEvent.click(screen.getByText('Get Started')) })
      expect(screen.queryByText('climb the ladder')).not.toBeInTheDocument()
    })
  })

  describe('App navigation', () => {
    it('shows header with nav items', async () => {
      await renderAndEnter()
      expect(navBtn('Feed')).toBeDefined()
      expect(navBtn('Ranks')).toBeDefined()
      expect(navBtn('FAQ')).toBeDefined()
    })
    it('navigates to FAQ', async () => {
      await renderAndEnter()
      await act(async () => { fireEvent.click(navBtn('FAQ')) })
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    })
    it('navigates back to landing', async () => {
      await renderAndEnter()
      await act(async () => { fireEvent.click(screen.getByLabelText('OutScroll home')) })
      expect(screen.getByText('climb the ladder')).toBeInTheDocument()
    })
    it('Profile nav only shows when authenticated', async () => {
      await renderAndEnter()
      expect(screen.queryAllByText('Profile').filter(el => el.tagName === 'BUTTON').length).toBe(0)
    })
  })

  describe('Feed page', () => {
    it('shows empty state', async () => {
      await renderAndEnter()
      expect(screen.getByText(/no videos yet/i)).toBeInTheDocument()
    })
  })

  describe('Leaderboard', () => {
    it('shows login prompt when not authed', async () => {
      await renderAndEnter()
      await act(async () => { fireEvent.click(navBtn('Ranks')) })
      // The leaderboard page renders immediately with login prompt when user is null
      await waitFor(() => {
        const leaderboard = screen.getByRole('main')
        expect(leaderboard.textContent).toContain('Sign in')
      }, { timeout: 3000 })
    })
  })

  describe('Auth page', () => {
    async function navigateToAuth() {
      await renderAndEnter()
      await act(async () => { fireEvent.click(navBtn('Ranks')) })
      await waitFor(() => {
        expect(screen.getByRole('main').textContent).toContain('Sign in')
      }, { timeout: 3000 })
      await act(async () => { fireEvent.click(screen.getByText('Sign In to View')) })
      await waitFor(() => expect(screen.getByText('Welcome back')).toBeInTheDocument())
    }

    it('shows login form via leaderboard sign in', async () => {
      await navigateToAuth()
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/pick a username/)).toBeInTheDocument()
    })
    it('switches to signup', async () => {
      await navigateToAuth()
      await act(async () => { fireEvent.click(screen.getByText(/don't have an account/i)) })
      expect(screen.getByText('Join OutScroll')).toBeInTheDocument()
    })
    it('shows honeypot fields on signup', async () => {
      await navigateToAuth()
      await act(async () => { fireEvent.click(screen.getByText(/don't have an account/i)) })
      const honeypotWebsite = document.querySelector('input[name="_website"]')
      const honeypotCompany = document.querySelector('input[name="_company"]')
      expect(honeypotWebsite).not.toBeNull()
      expect(honeypotCompany).not.toBeNull()
      // Both should be hidden from real users
      expect(honeypotWebsite.getAttribute('aria-hidden')).toBe('true')
      expect(honeypotCompany.getAttribute('aria-hidden')).toBe('true')
    })
    it('calls login API', async () => {
      await navigateToAuth()
      axios.post.mockResolvedValueOnce({ data: { token: 't', user: { id: '1', username: 'u' } } })
      fireEvent.change(screen.getByPlaceholderText(/pick a username/), { target: { value: 'test' } })
      fireEvent.change(screen.getByPlaceholderText(/min 8 chars/), { target: { value: 'TestPass1' } })
      await act(async () => { fireEvent.click(screen.getByText('Sign In')) })
      expect(axios.post).toHaveBeenCalledWith('/api/auth/login', { username: 'test', password: 'TestPass1' })
    })
    it('validates password on signup', async () => {
      await navigateToAuth()
      await act(async () => { fireEvent.click(screen.getByText(/don't have an account/i)) })
      fireEvent.change(screen.getByPlaceholderText(/pick a username/), { target: { value: 'u' } })
      fireEvent.change(screen.getByPlaceholderText(/you@email.com/), { target: { value: 'a@b.com' } })
      fireEvent.change(screen.getByPlaceholderText(/min 8 chars/), { target: { value: 'short' } })
      await act(async () => { fireEvent.click(screen.getByText('Create Account')) })
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
    it('shows email field on signup', async () => {
      await navigateToAuth()
      await act(async () => { fireEvent.click(screen.getByText(/don't have an account/i)) })
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })
    it('toggles login/signup', async () => {
      await navigateToAuth()
      await act(async () => { fireEvent.click(screen.getByText(/don't have an account/i)) })
      expect(screen.getByText('Join OutScroll')).toBeInTheDocument()
      await act(async () => { fireEvent.click(screen.getByText(/already have an account/i)) })
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
    })
  })

  describe('Legal pages', () => {
    it('FAQ page', async () => {
      await renderAndEnter()
      await act(async () => { fireEvent.click(navBtn('FAQ')) })
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    })
    it('toggles FAQ answer', async () => {
      await renderAndEnter()
      await act(async () => { fireEvent.click(navBtn('FAQ')) })
      await act(async () => { fireEvent.click(screen.getByText('What is OutScroll?')) })
      expect(screen.getByText(/free engagement leaderboard/i)).toBeInTheDocument()
    })
    it('Content Policy via footer', async () => {
      await renderAndEnter()
      const btn = footerBtn('Content Policy')
      expect(btn).toBeTruthy()
      await act(async () => { fireEvent.click(btn) })
      await waitFor(() => {
        const main = screen.getByRole('main')
        expect(main.textContent).toContain('Allowed')
      }, { timeout: 3000 })
    })
    it('Privacy Policy via footer', async () => {
      await renderAndEnter()
      const btn = footerBtn('Privacy Policy')
      expect(btn).toBeTruthy()
      await act(async () => { fireEvent.click(btn) })
      await waitFor(() => {
        const main = screen.getByRole('main')
        expect(main.textContent).toContain('Privacy Policy')
      }, { timeout: 3000 })
    })
    it('Terms via footer', async () => {
      await renderAndEnter()
      const btn = footerBtn('Terms')
      expect(btn).toBeTruthy()
      await act(async () => { fireEvent.click(btn) })
      expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    })
    it('Disclaimer via footer', async () => {
      await renderAndEnter()
      const btn = footerBtn('Disclaimer')
      expect(btn).toBeTruthy()
      await act(async () => { fireEvent.click(btn) })
      expect(screen.getByText('No Business Guarantees')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('skip link', async () => { await renderAndEnter(); expect(screen.getByText('Skip to content')).toBeInTheDocument() })
    it('banner landmark', async () => { await renderAndEnter(); expect(screen.getByRole('banner')).toBeInTheDocument() })
    it('navigation landmark', async () => { await renderAndEnter(); expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument() })
    it('main landmark', async () => { await renderAndEnter(); expect(screen.getByRole('main')).toBeInTheDocument() })
    it('contentinfo landmark', async () => { await renderAndEnter(); expect(screen.getByRole('contentinfo')).toBeInTheDocument() })
  })

  describe('Footer', () => {
    it('has all legal links', async () => {
      await renderAndEnter()
      const footer = screen.getByRole('contentinfo')
      const footerTexts = [...footer.querySelectorAll('button')].map(b => b.textContent)
      expect(footerTexts).toContain('FAQ')
      expect(footerTexts).toContain('Content Policy')
      expect(footerTexts).toContain('Privacy Policy')
      expect(footerTexts).toContain('Terms')
      expect(footerTexts).toContain('Disclaimer')
      expect(footerTexts).toContain('My Data')
    })
    it('shows GDPR text', async () => {
      await renderAndEnter()
      expect(screen.getByText(/DPDP & GDPR Compliant/)).toBeInTheDocument()
    })
  })

  describe('Data Rights', () => {
    it('shows data rights page via footer', async () => {
      await renderAndEnter()
      const btn = footerBtn('My Data')
      expect(btn).toBeTruthy()
      await act(async () => { fireEvent.click(btn) })
      await waitFor(() => expect(screen.getByText('Data Rights')).toBeInTheDocument())
    })
  })
})
