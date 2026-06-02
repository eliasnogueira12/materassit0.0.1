-- Allow other realtime channels for authenticated users, keep assistance-requests admin-only.
DROP POLICY IF EXISTS "Admins can subscribe to assistance_requests realtime" ON realtime.messages;

CREATE POLICY "Realtime: admins only for assistance-requests, others open"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN topic = 'assistance-requests' THEN public.has_role(auth.uid(), 'admin'::public.app_role)
    ELSE true
  END
);