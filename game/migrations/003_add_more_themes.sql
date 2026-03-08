INSERT INTO themes (slug, display_name) VALUES
  ('FLAGS', 'Flags'),
ON CONFLICT (slug) DO NOTHING;