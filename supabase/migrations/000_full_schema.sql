-- isA_Reading Full Schema
-- Run this in Supabase SQL Editor to set up everything

-- ============================================
-- 1. Materials table
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  paragraphs JSONB DEFAULT '[]'::jsonb,
  difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  theme TEXT NOT NULL DEFAULT 'general',
  domain TEXT NOT NULL DEFAULT 'general',
  word_count INT NOT NULL DEFAULT 0,
  audio_url TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_difficulty ON materials(difficulty);
CREATE INDEX IF NOT EXISTS idx_materials_theme ON materials(theme);

-- ============================================
-- 2. Child profiles (username + PIN auth)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  display_name TEXT,
  avatar TEXT NOT NULL DEFAULT '🎓',
  age INT,
  grade TEXT,
  preferred_themes JSONB DEFAULT '[]'::jsonb,
  reading_level INT NOT NULL DEFAULT 1 CHECK (reading_level BETWEEN 1 AND 5),
  total_points INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_reading_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(total_points DESC);

-- ============================================
-- 3. Sessions (linked to child)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES profiles(id),
  material_id UUID NOT NULL REFERENCES materials(id),
  status TEXT NOT NULL DEFAULT 'selecting',
  audio_url TEXT,
  duration_seconds REAL,
  transcript JSONB,
  assessment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_material ON sessions(material_id);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_child_created ON sessions(child_id, created_at DESC);

-- ============================================
-- 4. Points log
-- ============================================
CREATE TABLE IF NOT EXISTS points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  points INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_child ON points_log(child_id);

-- ============================================
-- 5. Badges
-- ============================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id),
  badge_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_badges_child ON badges(child_id);

-- ============================================
-- 6. Auth tokens
-- ============================================
CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tokens_child ON auth_tokens(child_id);

-- ============================================
-- 7. Storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;
