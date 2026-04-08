-- Materials: graded reading content
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  domain TEXT NOT NULL DEFAULT 'general',
  word_count INT NOT NULL DEFAULT 0,
  audio_url TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_materials_difficulty ON materials(difficulty);

-- Sessions: one reading practice session
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id),
  status TEXT NOT NULL DEFAULT 'selecting',
  audio_url TEXT,
  duration_seconds REAL,
  transcript JSONB,
  assessment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_material ON sessions(material_id);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;
