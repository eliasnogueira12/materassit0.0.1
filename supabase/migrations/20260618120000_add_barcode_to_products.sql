ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode text;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
