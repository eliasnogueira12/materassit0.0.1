-- Enable RLS on the settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Allow public read access to settings" ON settings
  FOR SELECT TO public USING (true);

-- Allow authenticated users to manage settings
CREATE POLICY "Allow authenticated users to manage settings" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
