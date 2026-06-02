-- Ensure app role enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Add missing domain fields used by the admin panel and kiosk
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_visible boolean NOT NULL DEFAULT true;

-- Keep timestamps fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_problems_updated_at ON public.problems;
CREATE TRIGGER set_problems_updated_at
BEFORE UPDATE ON public.problems
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Make user_roles reachable by the Data API for signed-in users and trusted server code
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Data API grants for admin-managed tables
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.problems TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.problems TO authenticated;
GRANT ALL ON public.problems TO service_role;

GRANT SELECT ON public.problem_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_products TO authenticated;
GRANT ALL ON public.problem_products TO service_role;

-- Robust role check: works with user_roles and secure principal email fallback.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_user_id uuid := COALESCE(_user_id, auth.uid());
  jwt_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  IF requested_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = requested_user_id
      AND ur.role = _role
  ) THEN
    RETURN true;
  END IF;

  -- Principal administrator fallback tied to the authenticated JWT email.
  IF _role = 'admin'::public.app_role AND jwt_email = 'elias432nogueira@gmail.com' THEN
    RETURN true;
  END IF;

  RETURN false;
END
$$;

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO anon, authenticated, service_role;

-- Ensure the principal admin role row exists when the account exists in Auth.
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'admin'::public.app_role
FROM auth.users au
WHERE lower(au.email) = 'elias432nogueira@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = au.id
      AND ur.role = 'admin'::public.app_role
  );

-- Enable RLS everywhere used by the admin panel
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_products ENABLE ROW LEVEL SECURITY;

-- Replace policies with explicit per-action rules to avoid missing WITH CHECK on inserts/updates
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));

DROP POLICY IF EXISTS "categories admin write" ON public.categories;
DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "Public can read active categories" ON public.categories
FOR SELECT TO public
USING (active = true OR public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can insert categories" ON public.categories
FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can update categories" ON public.categories
FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can delete categories" ON public.categories
FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));

DROP POLICY IF EXISTS "products admin write" ON public.products;
DROP POLICY IF EXISTS "products public read active" ON public.products;
CREATE POLICY "Public can read active products" ON public.products
FOR SELECT TO public
USING (active = true OR public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can insert products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can update products" ON public.products
FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can delete products" ON public.products
FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));

DROP POLICY IF EXISTS "problems admin write" ON public.problems;
DROP POLICY IF EXISTS "problems public read active" ON public.problems;
CREATE POLICY "Public can read active problems" ON public.problems
FOR SELECT TO public
USING (active = true OR public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can insert problems" ON public.problems
FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can update problems" ON public.problems
FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can delete problems" ON public.problems
FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));

DROP POLICY IF EXISTS "pp admin write" ON public.problem_products;
DROP POLICY IF EXISTS "pp public read" ON public.problem_products;
CREATE POLICY "Public can read problem product links" ON public.problem_products
FOR SELECT TO public
USING (true);
CREATE POLICY "Admins can insert problem product links" ON public.problem_products
FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can update problem product links" ON public.problem_products
FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can delete problem product links" ON public.problem_products
FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));