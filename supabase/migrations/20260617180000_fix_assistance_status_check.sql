-- The original CHECK constraint only allowed 'pending','attending','done'
-- but the code uses 'accepted','refused','expired' as well
ALTER TABLE public.assistance_requests
  DROP CONSTRAINT IF EXISTS assistance_requests_status_check,
  ADD CONSTRAINT assistance_requests_status_check
    CHECK (status IN ('pending','attending','accepted','refused','done','expired'));
