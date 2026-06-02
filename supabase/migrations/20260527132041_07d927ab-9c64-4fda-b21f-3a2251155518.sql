-- Restrict Realtime subscriptions on assistance_requests to admins only.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can subscribe to assistance_requests realtime" ON realtime.messages;
CREATE POLICY "Admins can subscribe to assistance_requests realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);