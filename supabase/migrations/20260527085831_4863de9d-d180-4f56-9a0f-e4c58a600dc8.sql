-- First remove policies that depend on the one-argument helper.
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

DROP POLICY IF EXISTS "Public can read active products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

DROP POLICY IF EXISTS "Public can read active problems" ON public.problems;
DROP POLICY IF EXISTS "Admins can insert problems" ON public.problems;
DROP POLICY IF EXISTS "Admins can update problems" ON public.problems;
DROP POLICY IF EXISTS "Admins can delete problems" ON public.problems;

DROP POLICY IF EXISTS "Admins can insert problem product links" ON public.problem_products;
DROP POLICY IF EXISTS "Admins can update problem product links" ON public.problem_products;
DROP POLICY IF EXISTS "Admins can delete problem product links" ON public.problem_products;

-- Now remove the helper with public surface and keep the canonical uuid+role function.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(public.app_role) FROM anon;
DROP FUNCTION IF EXISTS public.has_role(public.app_role);
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate policies using explicit canonical function calls.
CREATE POLICY "Users can read own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Public can read active categories" ON public.categories
FOR SELECT TO anon
USING (active = true);
CREATE POLICY "Authenticated admins can read all categories" ON public.categories
FOR SELECT TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert categories" ON public.categories
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update categories" ON public.categories
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete categories" ON public.categories
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Public can read active products" ON public.products
FOR SELECT TO anon
USING (active = true);
CREATE POLICY "Authenticated admins can read all products" ON public.products
FOR SELECT TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update products" ON public.products
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete products" ON public.products
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Public can read active problems" ON public.problems
FOR SELECT TO anon
USING (active = true);
CREATE POLICY "Authenticated admins can read all problems" ON public.problems
FOR SELECT TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert problems" ON public.problems
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update problems" ON public.problems
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete problems" ON public.problems
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert problem product links" ON public.problem_products
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update problem product links" ON public.problem_products
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete problem product links" ON public.problem_products
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));