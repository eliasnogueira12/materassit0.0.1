ALTER TABLE public.products
  ADD CONSTRAINT products_internal_code_key UNIQUE (internal_code);
