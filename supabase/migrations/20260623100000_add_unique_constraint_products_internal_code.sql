-- Add UNIQUE constraint on internal_code for products table
-- This enables upsert with onConflict in the NEUCE product import feature
ALTER TABLE public.products
  ADD CONSTRAINT products_internal_code_key UNIQUE (internal_code);
