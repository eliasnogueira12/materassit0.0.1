-- Add contact_email column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_email text;

-- Update RLS to allow anon/authenticated to access the new column
-- (already covered by existing "Anyone can manage their orders" policy)
