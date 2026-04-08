-- Child profiles (username + PIN auth, no email needed)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  display_name TEXT,
  avatar TEXT NOT NULL DEFAULT '🎓',
  age INT,
  grade TEXT, -- 'K', '1', '2', ... '8'
  preferred_themes JSONB DEFAULT '[]'::jsonb,
  reading_level INT NOT NULL DEFAULT 1 CHECK (reading_level BETWEEN 1 AND 5),
  total_points INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_reading_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_points ON profiles(total_points DESC);

-- Add child_id to sessions
ALTER TABLE sessions ADD COLUMN child_id UUID REFERENCES profiles(id);
CREATE INDEX idx_sessions_child ON sessions(child_id);
CREATE INDEX idx_sessions_child_created ON sessions(child_id, created_at DESC);

-- Points log (every point earn event)
CREATE TABLE points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  points INT NOT NULL,
  reason TEXT NOT NULL, -- 'reading_complete', 'accuracy_80', 'accuracy_95', 'streak_bonus'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_child ON points_log(child_id);
CREATE INDEX idx_points_child_created ON points_log(child_id, created_at DESC);

-- Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id),
  badge_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, badge_key)
);

CREATE INDEX idx_badges_child ON badges(child_id);

-- Auth tokens (simple session tokens)
CREATE TABLE auth_tokens (
  token TEXT PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tokens_child ON auth_tokens(child_id);
CREATE INDEX idx_tokens_expires ON auth_tokens(expires_at);
