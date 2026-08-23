const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

app.use(cors());
app.use(express.json());

// Auth middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ========== SIGNUP ==========
app.post('/api/auth/signup', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }
  try {
    const hashedPwd = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, total_points',
      [email, username, hashedPwd]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== LOGIN ==========
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, total_points FROM users WHERE username = $1',
      [username]
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
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== GET FEED ==========
app.get('/api/videos/feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;
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
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== SUBMIT VIDEO ==========
app.post('/api/videos/submit', authenticate, async (req, res) => {
  const { url } = req.body;
  const user_id = req.user.id;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Check 1 post/day limit
    const today = new Date().toISOString().split('T')[0];
    const check = await pool.query(
      'SELECT id FROM videos WHERE submitted_by = $1 AND DATE(created_at) = $2',
      [user_id, today]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Already posted today. Come back tomorrow!' });
    }

    const result = await pool.query(
      'INSERT INTO videos (url, submitted_by) VALUES ($1, $2) RETURNING id, url, created_at',
      [url, user_id]
    );

    // Update last_post_date
    await pool.query(
      'UPDATE users SET last_post_date = $1 WHERE id = $2',
      [today, user_id]
    );

    res.json({ video: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== TRACK ENGAGEMENT ==========
app.post('/api/engagement/track', authenticate, async (req, res) => {
  const { video_id, action } = req.body;
  const user_id = req.user.id;

  const pointsMap = {
    'play': 5,
    '50_watch': 70,
    'full_watch': 100,
    'skip': -5
  };

  if (!(action in pointsMap)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const points = pointsMap[action];

  try {
    // Check for duplicate engagement (same user, video, action within 1 hour)
    const recentCheck = await pool.query(
      `SELECT id FROM engagements
       WHERE user_id = $1 AND video_id = $2 AND action = $3
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [user_id, video_id, action]
    );

    if (recentCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already tracked this action recently' });
    }

    await pool.query(
      'INSERT INTO engagements (user_id, video_id, action, points) VALUES ($1, $2, $3, $4)',
      [user_id, video_id, action, points]
    );

    await pool.query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [points, user_id]
    );

    // Increment watch_count for play/full_watch
    if (action === 'play' || action === 'full_watch') {
      await pool.query(
        'UPDATE videos SET watch_count = watch_count + 1 WHERE id = $1',
        [video_id]
      );
    }

    res.json({ success: true, points_awarded: points });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
    // Get user's videos
    const videos = await pool.query(
      'SELECT id, url, watch_count, created_at FROM videos WHERE submitted_by = $1 ORDER BY created_at DESC',
      [req.params.user_id]
    );
    res.json({
      user: user.rows[0],
      rank: parseInt(rank.rows[0].rank) + 1,
      videos: videos.rows
    });
  } catch (err) {
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
    const today = new Date().toISOString().split('T')[0];
    const hasPostedToday = await pool.query(
      'SELECT id FROM videos WHERE submitted_by = $1 AND DATE(created_at) = $2',
      [req.user.id, today]
    );
    res.json({
      user: user.rows[0],
      rank: parseInt(rank.rows[0].rank) + 1,
      has_posted_today: hasPostedToday.rows.length > 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OutScroll API running on port ${PORT}`));
