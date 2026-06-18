import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type BarcodeLookupResult = {
  name?: string;
  brand?: string;
  image?: string;
  category?: string;
  description?: string;
};

export const lookupBarcode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ barcode: z.string().min(1).max(50) }).parse(d))
  .handler(async ({ data }): Promise<BarcodeLookupResult | null> => {
    const apiKey = process.env.UPCITEMDB_API_KEY;
    if (apiKey) {
      try {
        const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(data.barcode)}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const json = await res.json();
          const item = json.items?.[0];
          if (item) {
            return {
              name: item.title,
              brand: item.brand,
              image: item.images?.[0],
              category: item.category,
              description: item.description,
            };
          }
        }
      } catch {
        /* fall through */
      }
    }

    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data.barcode)}.json`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 1) {
          const p = json.product;
          return {
            name: p.product_name || p.generic_name,
            brand: p.brands,
            image: p.image_url,
            category: p.categories,
            description: [p.generic_name, p.ingredients_text].filter(Boolean).join(" - "),
          };
        }
      }
    } catch {
      /* fall through */
    }

    return null;
  });
