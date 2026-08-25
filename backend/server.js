const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ========== CONFIG ==========
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const ADMIN_KEY = process.env.ADMIN_KEY || crypto.randomBytes(32).toString('hex');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ========== MIDDLEWARE ==========
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.tiktok.com", "https://www.instagram.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', {
  skip: (req) => req.url === '/api/health',
}));

// ========== RATE LIMITERS ==========
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);

// ========== HELPERS ==========
function sanitizeUsername(username) {
  return username.replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function generateTokenPair(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, type: 'refresh', jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

// Track failed login attempts (in-memory for MVP; use Redis in production)
const loginAttempts = new Map();

function checkLoginAttempts(identifier) {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return { blocked: false, attempts: 0 };

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timePassed = Date.now() - attempts.lastAttempt;
    if (timePassed < LOCKOUT_DURATION_MINUTES * 60 * 1000) {
      return { blocked: true, attempts: attempts.count, retryAfter: Math.ceil((LOCKOUT_DURATION_MINUTES * 60 * 1000 - timePassed) / 60000) };
    }
    // Reset after lockout period
    loginAttempts.delete(identifier);
    return { blocked: false, attempts: 0 };
  }
  return { blocked: false, attempts: attempts.count };
}

function recordFailedLogin(identifier) {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  loginAttempts.set(identifier, {
    count: attempts.count + 1,
    lastAttempt: Date.now(),
  });
}

function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier);
}

// ========== ANTI-BOT HELPERS ==========
const signupTimestamps = new Map(); // Track form submission times
const MIN_FORM_TIME_MS = 3000; // Minimum 3 seconds to fill signup form

function checkAntiBot(req, res, next) {
  // 1. Honeypot field check — bots fill hidden fields
  const honeypot = req.body._website || req.body._company || req.body._fax;
  if (honeypot) {
    console.log(`[BOT BLOCKED] Honeypot filled from ${req.ip}`);
    return res.status(400).json({ error: 'Invalid request' });
  }

  // 2. Time-based check — bots submit too fast
  const formStarted = req.headers['x-form-start'];
  if (formStarted) {
    const elapsed = Date.now() - parseInt(formStarted, 10);
    if (elapsed < MIN_FORM_TIME_MS) {
      console.log(`[BOT BLOCKED] Form submitted in ${elapsed}ms from ${req.ip}`);
      return res.status(400).json({ error: 'Please take your time filling out the form' });
    }
  }

  // 3. Missing or suspicious User-Agent
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.length < 10 || /bot|crawler|spider|scraper|curl|wget|python/i.test(ua)) {
    console.log(`[BOT BLOCKED] Suspicious User-Agent: ${ua} from ${req.ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  // 4. Check for required browser headers (bots often miss these)
  if (!req.headers['accept-language'] || !req.headers['accept-encoding']) {
    console.log(`[BOT BLOCKED] Missing browser headers from ${req.ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}

// Track engagement patterns for anomaly detection
const engagementTracker = new Map(); // userId -> [{action, timestamp}]
const MAX_ACTIONS_PER_MINUTE = 10;
const MAX_ACTIONS_PER_HOUR = 100;

function checkEngagementAnomaly(userId) {
  const now = Date.now();
  const actions = engagementTracker.get(userId) || [];
  
  // Clean old entries
  const recent = actions.filter(a => now - a.timestamp < 3600000);
  engagementTracker.set(userId, recent);

  // Check per-minute rate
  const lastMinute = recent.filter(a => now - a.timestamp < 60000);
  if (lastMinute.length >= MAX_ACTIONS_PER_MINUTE) {
    return { blocked: true, reason: 'Too many actions per minute' };
  }

  // Check per-hour rate
  if (recent.length >= MAX_ACTIONS_PER_HOUR) {
    return { blocked: true, reason: 'Too many actions per hour' };
  }

  return { blocked: false };
}

// ========== AUTH MIDDLEWARE ==========
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') return res.status(401).json({ error: 'Invalid token type' });
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ error: message });
  }
}

// ========== HEALTH CHECK ==========
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'error', error: 'Database unavailable' });
  }
});

// ========== SIGNUP ==========
app.post('/api/auth/signup', authLimiter, checkAntiBot, async (req, res) => {
  const { email, username, password, business_name, business_website, business_description } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const cleanUsername = sanitizeUsername(username);
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, _, -)' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check password strength
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasNumber) {
    return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number' });
  }

  try {
    const hashedPwd = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, business_name, business_website, business_description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, total_points, approval_status`,
      [email.toLowerCase().trim(), cleanUsername, hashedPwd, business_name || null, business_website || null, business_description || null]
    );
    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokenPair(user);
    setRefreshCookie(res, refreshToken);
    res.json({ user, token: accessToken });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== LOGIN ==========
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const identifier = username.trim().toLowerCase();

  // Check lockout
  const lockout = checkLoginAttempts(identifier);
  if (lockout.blocked) {
    return res.status(429).json({
      error: `Account temporarily locked. Try again in ${lockout.retryAfter} minutes.`,
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, total_points, approval_status, business_name, business_website FROM users WHERE username = $1',
      [username.trim()]
    );
    if (result.rows.length === 0) {
      recordFailedLogin(identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFailedLogin(identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearLoginAttempts(identifier);
    const { accessToken, refreshToken } = generateTokenPair(user);
    setRefreshCookie(res, refreshToken);
    delete user.password_hash;
    res.json({ user, token: accessToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== REFRESH TOKEN ==========
app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const user = await pool.query(
      'SELECT id, username, email, total_points FROM users WHERE id = $1',
      [decoded.id]
    );
    if (user.rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user.rows[0]);
    setRefreshCookie(res, newRefreshToken);
    res.json({ token: accessToken, user: user.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ========== LOGOUT ==========
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
});

// ========== GET FEED ==========
app.get('/api/videos/feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const result = await pool.query(
      `SELECT v.id, v.url, v.watch_count, u.username, v.created_at
       FROM videos v
       JOIN users u ON v.submitted_by = u.id
       ORDER BY v.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ videos: result.rows });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== SUBMIT VIDEO ==========
app.post('/api/videos/submit', authenticate, submitLimiter, checkAntiBot, async (req, res) => {
  const { url } = req.body;
  const user_id = req.user.id;

  // Check approval status
  const userCheck = await pool.query('SELECT approval_status FROM users WHERE id = $1', [user_id]);
  if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  if (userCheck.rows[0].approval_status !== 'approved') {
    return res.status(403).json({ error: 'Your business profile is pending approval. You can post videos once approved.' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
  }

  // Strict URL validation: only TikTok, Instagram Reels, YouTube Shorts
  const hostname = parsedUrl.hostname.replace(/^www\./, '');
  const pathname = parsedUrl.pathname.toLowerCase();

  const isTikTok = hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com');
  const isInstagramReel = hostname === 'instagram.com' && pathname.includes('/reel/');
  const isYouTubeShort = (hostname === 'youtube.com' || hostname === 'youtu.be') &&
    (pathname.includes('/shorts/') || pathname === '/shorts');

  if (!isTikTok && !isInstagramReel && !isYouTubeShort) {
    return res.status(400).json({
      error: 'Only TikTok videos, Instagram Reels, and YouTube Shorts are allowed. Regular YouTube videos, Instagram posts, and other links are not permitted.',
    });
  }

  if (url.length > 500) {
    return res.status(400).json({ error: 'URL too long (max 500 characters)' });
  }

  try {
    const today = getCurrentDate();
    const check = await pool.query(
      'SELECT id FROM videos WHERE submitted_by = $1 AND DATE(created_at) = $2',
      [user_id, today]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Already posted today. Come back tomorrow!' });
    }

    const result = await pool.query(
      'INSERT INTO videos (url, submitted_by) VALUES ($1, $2) RETURNING id, url, created_at',
      [url.trim(), user_id]
    );

    await pool.query(
      'UPDATE users SET last_post_date = $1 WHERE id = $2',
      [today, user_id]
    );

    // Log admin notification (visible in admin dashboard)
    const platform = isTikTok ? 'TikTok' : isInstagramReel ? 'Instagram Reels' : 'YouTube Shorts';
    console.log(`[VIDEO SUBMITTED] ${platform} by user ${user_id} (${url.trim()})`);

    res.json({ video: result.rows[0] });
  } catch (err) {
    console.error('Submit video error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== TRACK ENGAGEMENT (with transaction) ==========
app.post('/api/engagement/track', authenticate, trackLimiter, async (req, res) => {
  const { video_id, action } = req.body;
  const user_id = req.user.id;

  const pointsMap = { 'play': 5, '50_watch': 70, 'full_watch': 100, 'skip': -5 };

  if (!(action in pointsMap)) return res.status(400).json({ error: 'Invalid action' });
  if (!video_id) return res.status(400).json({ error: 'video_id is required' });

  // Anti-bot: check engagement pattern anomaly
  const anomaly = checkEngagementAnomaly(user_id);
  if (anomaly.blocked) {
    console.log(`[BOT BLOCKED] ${anomaly.reason} for user ${user_id}`);
    return res.status(429).json({ error: anomaly.reason });
  }
  // Record this action
  const userActions = engagementTracker.get(user_id) || [];
  userActions.push({ action, timestamp: Date.now() });
  engagementTracker.set(user_id, userActions);

  const points = pointsMap[action];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const recentCheck = await client.query(
      `SELECT id FROM engagements
       WHERE user_id = $1 AND video_id = $2 AND action = $3
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [user_id, video_id, action]
    );

    if (recentCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Already tracked this action recently' });
    }

    const videoCheck = await client.query('SELECT id FROM videos WHERE id = $1', [video_id]);
    if (videoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Video not found' });
    }

    await client.query(
      'INSERT INTO engagements (user_id, video_id, action, points) VALUES ($1, $2, $3, $4)',
      [user_id, video_id, action, points]
    );

    await client.query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [points, user_id]
    );

    if (action === 'play' || action === 'full_watch') {
      await client.query('UPDATE videos SET watch_count = watch_count + 1 WHERE id = $1', [video_id]);
    }

    // Create notification for video owner (not self)
    const videoOwner = await client.query('SELECT submitted_by FROM videos WHERE id = $1', [video_id]);
    if (videoOwner.rows.length > 0 && videoOwner.rows[0].submitted_by !== user_id) {
      const watcherName = await client.query('SELECT username FROM users WHERE id = $1', [user_id]);
      const actionLabels = { 'play': 'started watching', '50_watch': 'watched 50% of', 'full_watch': 'fully watched', 'skip': 'skipped' };
      const notifMsg = `${watcherName.rows[0]?.username || 'Someone'} ${actionLabels[action] || action} your video`;
      await client.query(
        'INSERT INTO notifications (user_id, type, message, video_id, from_username, points) VALUES ($1, $2, $3, $4, $5, $6)',
        [videoOwner.rows[0].submitted_by, 'engagement', notifMsg, video_id, watcherName.rows[0]?.username, points]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, points_awarded: points });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Track engagement error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ========== LEADERBOARD ==========
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank,
        username, total_points, created_at
       FROM users ORDER BY total_points DESC LIMIT 100`
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== USER PROFILE ==========
app.get('/api/users/:user_id', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, total_points, created_at FROM users WHERE id = $1',
      [req.params.user_id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const rank = await pool.query(
      'SELECT COUNT(*) as rank FROM users WHERE total_points > $1',
      [user.rows[0].total_points]
    );
    const videos = await pool.query(
      'SELECT id, url, watch_count, created_at FROM videos WHERE submitted_by = $1 ORDER BY created_at DESC',
      [req.params.user_id]
    );
    res.json({ user: user.rows[0], rank: parseInt(rank.rows[0].rank, 10) + 1, videos: videos.rows });
  } catch (err) {
    console.error('User profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== MY PROFILE (self) ==========
app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT id, username, total_points, created_at,
       business_name, business_website, business_description, approval_status, rejection_reason
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const rank = await pool.query(
      'SELECT COUNT(*) as rank FROM users WHERE total_points > $1',
      [user.rows[0].total_points]
    );
    const today = getCurrentDate();
    const hasPostedToday = await pool.query(
      'SELECT id FROM videos WHERE submitted_by = $1 AND DATE(created_at) = $2',
      [req.user.id, today]
    );
    res.json({
      user: user.rows[0],
      rank: parseInt(rank.rows[0].rank, 10) + 1,
      has_posted_today: hasPostedToday.rows.length > 0,
    });
  } catch (err) {
    console.error('My profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== DELETE ACCOUNT (GDPR Art. 17, DPDP §6) ==========
app.delete('/api/me', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.id;

    // Delete in correct order (foreign key constraints)
    await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM engagements WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM videos WHERE submitted_by = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    console.log(`Account deleted: ${userId}`);
    res.json({ success: true, message: 'Account and all personal data permanently deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  } finally {
    client.release();
  }
});

// ========== BUSINESS SUBMISSION ==========
app.put('/api/business/submit', authenticate, async (req, res) => {
  const { business_name, business_website, business_description } = req.body;
  if (!business_name || !business_website) {
    return res.status(400).json({ error: 'Business name and website are required' });
  }

  // Validate URL
  try { new URL(business_website); } catch {
    return res.status(400).json({ error: 'Invalid website URL' });
  }

  try {
    await pool.query(
      `UPDATE users SET business_name = $1, business_website = $2, business_description = $3, approval_status = 'pending'
       WHERE id = $4`,
      [business_name, business_website.trim(), business_description || null, req.user.id]
    );
    res.json({ success: true, message: 'Business profile submitted for review' });
  } catch (err) {
    console.error('Business submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/business/status', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT business_name, business_website, business_description, approval_status, rejection_reason FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error('Business status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN MIDDLEWARE ==========
function adminOnly(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ========== ADMIN: List pending businesses ==========
app.get('/api/admin/pending', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, business_name, business_website, business_description, approval_status, rejection_reason, created_at
       FROM users WHERE approval_status IN ('pending', 'rejected')
       ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin pending error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: List all users ==========
app.get('/api/admin/users', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, total_points, business_name, approval_status, created_at
       FROM users ORDER BY total_points DESC LIMIT 200`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: Approve/reject business ==========
app.put('/api/admin/review', adminOnly, async (req, res) => {
  const { user_id, action, rejection_reason } = req.body;
  if (!user_id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Missing user_id or invalid action' });
  }
  try {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const reason = action === 'reject' ? (rejection_reason || 'Does not meet content policy') : null;
    await pool.query(
      'UPDATE users SET approval_status = $1, rejection_reason = $2 WHERE id = $3',
      [status, reason, user_id]
    );
    // Create notification for the user
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length > 0) {
      const message = action === 'approve'
        ? 'Your business has been approved! You can now post video ads.'
        : `Your business was not approved. Reason: ${reason}`;
      await pool.query(
        'INSERT INTO notifications (user_id, type, message, points) VALUES ($1, $2, $3, 0)',
        [user_id, 'approval_update', message]
      );
    }
    res.json({ success: true, status });
  } catch (err) {
    console.error('Admin review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: Stats ==========
app.get('/api/admin/stats', adminOnly, async (req, res) => {
  try {
    const [users, videos, pending, engagements] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM videos'),
      pool.query("SELECT COUNT(*) as count FROM users WHERE approval_status = 'pending'"),
      pool.query('SELECT COUNT(*) as count FROM engagements'),
    ]);
    res.json({
      total_users: parseInt(users.rows[0].count, 10),
      total_videos: parseInt(videos.rows[0].count, 10),
      pending_review: parseInt(pending.rows[0].count, 10),
      total_engagements: parseInt(engagements.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: Recent videos ==========
app.get('/api/admin/videos', adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const result = await pool.query(
      `SELECT v.id, v.url, v.watch_count, v.created_at,
       u.username, u.business_name, u.approval_status
       FROM videos v
       JOIN users u ON v.submitted_by = u.id
       ORDER BY v.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ videos: result.rows });
  } catch (err) {
    console.error('Admin videos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== CONTENT POLICY ==========
app.get('/api/content-policy', (req, res) => {
  res.json({
    policy: {
      title: 'OutScroll Content Policy',
      lastUpdated: '2026-08-23',
      allowed: [
        'Business promotion videos (vertical format: Reels, Shorts, TikTok)',
        'Product demos and showcases',
        'Company culture and behind-the-scenes content',
        'Service explanations and tutorials',
        'Customer testimonials (with consent)',
      ],
      prohibited: [
        'Pornography, sexually explicit content, or adult material of any kind',
        'Gambling, betting, or casino-related content',
        'Weapons, firearms, ammunition, or military equipment sales',
        'Drugs, controlled substances, or drug paraphernalia',
        'Hate speech, discrimination, or harassment of any group',
        'Misinformation, fake news, or deliberately misleading content',
        'Scams, pyramid schemes, or fraudulent business opportunities',
        'Content that violates any applicable local, state, or international law',
        'Violence, graphic content, or content that promotes harm',
        'Spam, repeated identical submissions, or engagement farming',
        'Non-vertical video content (landscape videos, podcasts, etc.)',
        'Content that infringes on third-party intellectual property rights',
      ],
      enforcement: 'Violations result in immediate account suspension and content removal. Repeated violations result in permanent ban.',
      reporting: 'Report violations through the platform. All reports are reviewed within 24 hours.',
    }
  });
});

// ========== NOTIFICATIONS ==========
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const result = await pool.query(
      'SELECT id, type, message, video_id, from_username, points, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.user.id, limit]
    );
    const unread = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [req.user.id]
    );
    res.json({ notifications: result.rows, unread_count: parseInt(unread.rows[0].count, 10) });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/read', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notifications read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

console.log('ADMIN_KEY:', ADMIN_KEY);

// ========== START SERVER ==========
const server = app.listen(PORT, () => {
  console.log(`OutScroll API running on port ${PORT}`);
});

// ========== GRACEFUL SHUTDOWN ==========
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    console.log('Database pool closed.');
    process.exit(0);
  });
  setTimeout(() => { console.error('Forced shutdown'); process.exit(1); }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
