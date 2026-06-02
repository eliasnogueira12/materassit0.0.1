CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
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

  IF _role = 'admin'::public.app_role AND jwt_email = 'elias432nogueira@gmail.com' THEN
    RETURN true;
  END IF;

  RETURN false;
END
$$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT private.has_role(_user_id, _role)
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;