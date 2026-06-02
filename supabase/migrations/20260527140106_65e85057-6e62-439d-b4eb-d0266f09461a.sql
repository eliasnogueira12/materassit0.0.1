
CREATE SEQUENCE IF NOT EXISTS public.customer_number_seq START 1000;

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number integer NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  blocked boolean NOT NULL DEFAULT false,
  notes text
);

GRANT SELECT, INSERT, UPDATE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT USAGE ON SEQUENCE public.customer_number_seq TO anon, authenticated, service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_customer()
RETURNS TABLE(id uuid, customer_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num integer;
  v_id uuid;
BEGIN
  v_num := nextval('public.customer_number_seq');
  INSERT INTO public.customers (customer_number)
    VALUES (v_num)
    RETURNING customers.id INTO v_id;
  RETURN QUERY SELECT v_id, v_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.find_customer(p_number integer)
RETURNS TABLE(id uuid, customer_number integer, blocked boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers SET last_seen_at = now()
   WHERE customers.customer_number = p_number AND customers.blocked = false;
  RETURN QUERY
    SELECT c.id, c.customer_number, c.blocked, c.created_at
      FROM public.customers c
     WHERE c.customer_number = p_number AND c.blocked = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_customer(integer) TO anon, authenticated;

CREATE TABLE public.customer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('search','recommendation','assistance','visit','product_view')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_history_customer_id ON public.customer_history(customer_id, created_at DESC);

GRANT SELECT, INSERT ON public.customer_history TO anon, authenticated;
GRANT ALL ON public.customer_history TO service_role;

ALTER TABLE public.customer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert history" ON public.customer_history
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    customer_id IS NOT NULL
    AND char_length(event_type) BETWEEN 1 AND 40
  );

CREATE POLICY "Admins read history" ON public.customer_history
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete history" ON public.customer_history
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.assistance_requests
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN customer_number integer,
  ADD COLUMN reason text,
  ADD COLUMN accepted_at timestamptz,
  ADD COLUMN expires_at timestamptz;

CREATE POLICY "Anyone can read assistance requests" ON public.assistance_requests
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can expire pending requests" ON public.assistance_requests
  FOR UPDATE TO anon, authenticated
  USING (status = 'pending')
  WITH CHECK (status IN ('pending','expired'));

DROP POLICY IF EXISTS "Anyone can create assistance requests" ON public.assistance_requests;
CREATE POLICY "Anyone can create assistance requests" ON public.assistance_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(kiosk_label) BETWEEN 1 AND 60
    AND (message IS NULL OR char_length(message) <= 500)
    AND (reason IS NULL OR char_length(reason) <= 200)
  );

ALTER TABLE public.assistance_requests REPLICA IDENTITY FULL;
