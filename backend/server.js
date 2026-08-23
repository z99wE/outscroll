const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ========== CONFIG ==========
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 3000;

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// ========== RATE LIMITERS ==========
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many requests, slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========== HELPERS ==========
function sanitizeUsername(username) {
  // Allow only alphanumeric, underscores, and hyphens
  return username.replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function getCurrentDate() {
  // Use a consistent timezone-aware date (UTC is fine if consistent)
  return new Date().toISOString().split('T')[0];
}

// ========== AUTH MIDDLEWARE ==========
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
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
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const cleanUsername = sanitizeUsername(username);
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, _, -)' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPwd = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, total_points',
      [email.toLowerCase().trim(), cleanUsername, hashedPwd]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
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

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, total_points FROM users WHERE username = $1',
      [username.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
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
app.post('/api/videos/submit', authenticate, submitLimiter, async (req, res) => {
  const { url } = req.body;
  const user_id = req.user.id;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format and length
  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
  }

  if (url.length > 500) {
    return res.status(400).json({ error: 'URL too long (max 500 characters)' });
  }

  try {
    // Check 1 post/day limit
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

  const pointsMap = {
    'play': 5,
    '50_watch': 70,
    'full_watch': 100,
    'skip': -5,
  };

  if (!(action in pointsMap)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  if (!video_id) {
    return res.status(400).json({ error: 'video_id is required' });
  }

  const points = pointsMap[action];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check for duplicate engagement (same user, video, action within 1 hour)
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

    // Verify video exists
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

    // Increment watch_count for play/full_watch
    if (action === 'play' || action === 'full_watch') {
      await client.query(
        'UPDATE videos SET watch_count = watch_count + 1 WHERE id = $1',
        [video_id]
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
      `SELECT
        ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank,
        username, total_points, created_at
       FROM users
       ORDER BY total_points DESC
       LIMIT 100`
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
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const rank = await pool.query(
      'SELECT COUNT(*) as rank FROM users WHERE total_points > $1',
      [user.rows[0].total_points]
    );
    const videos = await pool.query(
      'SELECT id, url, watch_count, created_at FROM videos WHERE submitted_by = $1 ORDER BY created_at DESC',
      [req.params.user_id]
    );
    res.json({
      user: user.rows[0],
      rank: parseInt(rank.rows[0].rank, 10) + 1,
      videos: videos.rows,
    });
  } catch (err) {
    console.error('User profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== MY PROFILE (self) ==========
app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, email, total_points, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
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

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
