import { describe, it, expect } from 'vitest'

// Extract parseVideoUrl for testing (copy the function here since it's not exported)
function parseVideoUrl(url) {
  if (!url) return { platform: 'unknown', embedUrl: null, icon: '🔗' }
  try {
    const u = new URL(url)
    if (u.hostname.includes('tiktok.com')) {
      const videoId = u.pathname.split('/').pop()
      return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`, icon: '♪' }
    }
    if (u.hostname.includes('instagram.com')) {
      return { platform: 'instagram', embedUrl: `${u.href.endsWith('/') ? u.href : u.href + '/'}`, icon: '◎' }
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1)
      } else {
        videoId = u.searchParams.get('v')
      }
      return { platform: 'youtube', embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null, icon: '▶' }
    }
    if (u.hostname.includes('twitter.com') || u.hostname.includes('x.com')) {
      return { platform: 'twitter', embedUrl: null, icon: '𝕏' }
    }
    return { platform: 'unknown', embedUrl: null, icon: '🔗' }
  } catch {
    return { platform: 'unknown', embedUrl: null, icon: '🔗' }
  }
}

describe('parseVideoUrl', () => {
  it('returns unknown for null/undefined/empty', () => {
    expect(parseVideoUrl(null)).toEqual({ platform: 'unknown', embedUrl: null, icon: '🔗' })
    expect(parseVideoUrl(undefined)).toEqual({ platform: 'unknown', embedUrl: null, icon: '🔗' })
    expect(parseVideoUrl('')).toEqual({ platform: 'unknown', embedUrl: null, icon: '🔗' })
  })

  it('returns unknown for invalid URLs', () => {
    expect(parseVideoUrl('not-a-url')).toEqual({ platform: 'unknown', embedUrl: null, icon: '🔗' })
  })

  it('parses TikTok URLs correctly', () => {
    const result = parseVideoUrl('https://www.tiktok.com/@user/video/123456')
    expect(result.platform).toBe('tiktok')
    expect(result.embedUrl).toBe('https://www.tiktok.com/embed/v2/123456')
    expect(result.icon).toBe('♪')
  })

  it('parses YouTube watch URLs correctly', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result.platform).toBe('youtube')
    expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('parses YouTube short URLs correctly', () => {
    const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result.platform).toBe('youtube')
    expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('parses Instagram URLs correctly', () => {
    const result = parseVideoUrl('https://www.instagram.com/reel/ABC123/')
    expect(result.platform).toBe('instagram')
    expect(result.embedUrl).toContain('instagram.com')
  })

  it('parses Twitter/X URLs correctly', () => {
    const result = parseVideoUrl('https://x.com/user/status/123456')
    expect(result.platform).toBe('twitter')
    expect(result.embedUrl).toBeNull()
  })

  it('parses unknown platform URLs correctly', () => {
    const result = parseVideoUrl('https://vimeo.com/123456')
    expect(result.platform).toBe('unknown')
  })
})
