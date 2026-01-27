-- Themes table
CREATE TABLE IF NOT EXISTS themes (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_slug TEXT REFERENCES themes(slug),
  prompt TEXT NOT NULL,
  difficulty INT DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  answer_count_cache INT DEFAULT 0
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  display_text TEXT NOT NULL,
  variants JSONB DEFAULT '[]'::jsonb,
  popularity_rank INT DEFAULT 99 CHECK (popularity_rank >= 1 AND popularity_rank <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_theme ON questions(theme_slug);
CREATE INDEX IF NOT EXISTS idx_questions_answer_count ON questions(answer_count_cache);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_popularity ON answers(popularity_rank);

-- Sample data
INSERT INTO themes (slug, display_name) VALUES
  ('geography', 'Geography'),
  ('pop-culture', 'Pop Culture'),
  ('movies', 'Movies & TV'),
  ('sports', 'Sports'),
  ('science', 'Science')
ON CONFLICT (slug) DO NOTHING;

-- Sample questions
INSERT INTO questions (theme_slug, prompt, difficulty, answer_count_cache) VALUES
  ('geography', 'Name a country that has the letter J in its name', 2, 5),
  ('geography', 'Name a country in North America', 1, 3),
  ('pop-culture', 'Name a famous mathematician', 3, 4)
ON CONFLICT DO NOTHING;

-- Sample answers
INSERT INTO answers (question_id, display_text, variants, popularity_rank)
SELECT 
  q.id,
  'Japan',
  '["japan", "jp", "nippon"]'::jsonb,
  1
FROM questions q WHERE q.prompt = 'Name a country that has the letter J in its name'
ON CONFLICT DO NOTHING;

INSERT INTO answers (question_id, display_text, variants, popularity_rank)
SELECT 
  q.id,
  'Jordan',
  '["jordan", "hashemite kingdom"]'::jsonb,
  2
FROM questions q WHERE q.prompt = 'Name a country that has the letter J in its name'
ON CONFLICT DO NOTHING;

INSERT INTO answers (question_id, display_text, variants, popularity_rank)
SELECT 
  q.id,
  'USA',
  '["usa", "united states", "america", "us"]'::jsonb,
  1
FROM questions q WHERE q.prompt = 'Name a country in North America'
ON CONFLICT DO NOTHING;

INSERT INTO answers (question_id, display_text, variants, popularity_rank)
SELECT 
  q.id,
  'Canada',
  '["canada", "can"]'::jsonb,
  2
FROM questions q WHERE q.prompt = 'Name a country in North America'
ON CONFLICT DO NOTHING;

INSERT INTO answers (question_id, display_text, variants, popularity_rank)
SELECT 
  q.id,
  'Mexico',
  '["mexico", "mex"]'::jsonb,
  3
FROM questions q WHERE q.prompt = 'Name a country in North America'
ON CONFLICT DO NOTHING;
