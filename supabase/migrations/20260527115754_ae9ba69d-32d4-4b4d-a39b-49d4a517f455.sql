
-- Extend products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price numeric(10,2),
  ADD COLUMN IF NOT EXISTS internal_code text,
  ADD COLUMN IF NOT EXISTS promotion_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS promotion_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Related products
CREATE TABLE IF NOT EXISTS public.product_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, related_product_id),
  CHECK (product_id <> related_product_id)
);

GRANT SELECT ON public.product_relations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_relations TO authenticated;
GRANT ALL ON public.product_relations TO service_role;

ALTER TABLE public.product_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read product relations" ON public.product_relations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert product relations" ON public.product_relations
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update product relations" ON public.product_relations
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete product relations" ON public.product_relations
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Assistance requests
CREATE TABLE IF NOT EXISTS public.assistance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_label text NOT NULL DEFAULT 'Quiosque 1',
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','attending','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

GRANT INSERT ON public.assistance_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistance_requests TO authenticated;
GRANT ALL ON public.assistance_requests TO service_role;

ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create assistance requests" ON public.assistance_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read assistance requests" ON public.assistance_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update assistance requests" ON public.assistance_requests
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete assistance requests" ON public.assistance_requests
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistance_requests;

CREATE INDEX IF NOT EXISTS idx_assistance_requests_status ON public.assistance_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_relations_product ON public.product_relations(product_id, display_order);
