-- Enforce uniqueness of display_text per question
CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_question_display_text
  ON answers (question_id, display_text);
