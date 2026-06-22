CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('videos', '["_rWPvpP1jmU", "l2PQO8Sg-y0"]'),
  ('phrases', '{"pt": {"welcome": "Bem-vindo à MarquesMater", "subtitle": "Toque para descobrir o produto certo para si."}, "en": {"welcome": "Welcome to MarquesMater", "subtitle": "Tap to find the right product for you."}, "es": {"welcome": "Bienvenido a MarquesMater", "subtitle": "Toque para encontrar el producto adecuado."}}'),
  ('theme', '{"primary": "navy", "accent": "orange"}')
ON CONFLICT (key) DO NOTHING;
