ALTER SEQUENCE public.customer_number_seq START WITH 10000 RESTART WITH 10000 MINVALUE 10000 MAXVALUE 99999 NO CYCLE;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='customers_customer_number_key'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_customer_number_key UNIQUE (customer_number);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_customer()
 RETURNS TABLE(id uuid, customer_number integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_num integer;
  v_id uuid;
  v_attempts integer := 0;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_num := nextval('public.customer_number_seq');
    BEGIN
      INSERT INTO public.customers (customer_number) VALUES (v_num)
        RETURNING customers.id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 20 THEN RAISE; END IF;
    END;
  END LOOP;
  RETURN QUERY SELECT v_id, v_num;
END;
$function$;