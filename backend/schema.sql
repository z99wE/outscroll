-- OutScroll Database Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  total_points INTEGER DEFAULT 0,
  last_post_date DATE,
  business_name VARCHAR(100),
  business_website VARCHAR(500),
  business_description TEXT,
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  verification_expires TIMESTAMP,
  points_decay_last_applied TIMESTAMP DEFAULT NOW(),
  business_url_verified_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_config (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id),
  reported_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR(500) NOT NULL,
  submitted_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  watch_count INTEGER DEFAULT 0
);

CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  video_id UUID NOT NULL REFERENCES videos(id),
  action VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  video_id UUID REFERENCES videos(id),
  from_username VARCHAR(50),
  points INTEGER,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_created ON videos(created_at DESC);
CREATE INDEX idx_users_points ON users(total_points DESC);
CREATE INDEX idx_users_approval ON users(approval_status);
CREATE INDEX idx_engagements_user ON engagements(user_id);
CREATE INDEX idx_engagements_video ON engagements(video_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contact_read ON contact_messages(read, created_at DESC);

-- ========== DATA RETENTION POLICY ==========
-- Videos older than 90 days are purged to keep the DB under 500MB.
-- Engagements older than 90 days are purged similarly.
-- Notifications older than 30 days are purged.
-- Run the /api/admin/purge endpoint periodically (via cron or manual trigger).
