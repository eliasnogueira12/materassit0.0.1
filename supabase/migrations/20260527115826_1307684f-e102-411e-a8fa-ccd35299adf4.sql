
DROP POLICY IF EXISTS "Anyone can create assistance requests" ON public.assistance_requests;

CREATE POLICY "Anyone can create assistance requests"
  ON public.assistance_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(kiosk_label) BETWEEN 1 AND 60
    AND (message IS NULL OR char_length(message) <= 500)
  );
