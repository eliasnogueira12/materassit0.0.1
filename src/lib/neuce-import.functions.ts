import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NEUCE_JSON_URL = "https://www.neuce.com/files/filtros/json__pt_pt.js";
const NEUCE_IMAGE_BASE = "https://www.neuce.com/";

type NeuceProduct = {
  id: string;
  ord: number;
  ref: string;
  price: number;
  price_riscado: number | null;
  pvp: string;
  t_stock: string;
  stock: string;
  enc_stock: string;
  image: string;
  title: string;
  subtitle: string;
  caminho: string;
  m_id: string;
  c: [];
  f: { fam: string; f_id: number }[];
};

function getImageUrl(path: string): string | null {
  if (!path) return null;
  return NEUCE_IMAGE_BASE + path;
}

function getPrice(price: number): number | null {
  return price > 0 ? price : null;
}

function extractCategory(families: { fam: string; f_id: number }[]): string {
  const catMap: Record<number, string> = {
    142: "Tintas para Madeira",
    143: "Tintas Decorativas",
    144: "Tintas Decorativas",
    145: "Impermeabilizantes",
    146: "Tintas para Pavimentos",
    147: "Sinalização Rodoviária",
    148: "Tintas para Madeira",
    149: "Efeitos Decorativos",
    151: "Diluentes e Solventes",
    152: "Tintas para Madeira",
    153: "Tintas para Madeira",
    154: "Tintas para Madeira",
    156: "Tintas Decorativas",
    157: "Proteção de Madeira",
    158: "Primários Industriais",
    159: "Tintas Decorativas",
    160: "Texturados",
    161: "Tintas Decorativas",
    162: "Anticorrosivos",
    163: "Limpeza e Preparação",
    164: "Mástiques e Selantes",
    165: "Revestimentos Flexíveis",
    166: "Revestimentos Pedra",
    167: "Especialidades",
    168: "Tintas para Telhados",
    169: "Microbetões",
    170: "Selantes",
    171: "Impermeabilizantes",
    172: "Primários e Reforço",
    174: "Primários Industriais",
    175: "Uso Geral",
    187: "Efeitos Metálicos",
    188: "Primários",
    189: "Altas Temperaturas",
    190: "Tintas para Alumínio",
    191: "Proteção contra Fogo",
    198: "Tintas Decorativas",
    199: "Tintas para Pavimentos",
    200: "Pavimentos",
    201: "Selantes para Pavimentos",
    207: "Sinalização Rodoviária",
    211: "Argamassas",
    212: "Linha Ecológica",
    213: "Betões",
    220: "Primários para Pavimentos",
    221: "Primários para Pavimentos",
    224: "Primários para Pavimentos",
    232: "Betão Projetado",
  };

  for (const f of families) {
    if (catMap[f.f_id]) return catMap[f.f_id];
  }
  return "Pintura";
}

function buildKeywords(product: NeuceProduct): string {
  const parts = [product.ref, `neuce`, product.title];
  for (const f of product.f) {
    const name = extractCategory([f]);
    if (name) parts.push(name.toLowerCase());
  }
  return [...new Set(parts)].join(", ");
}

export const importNeuceProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const results = { total: 0, inserted: 0, updated: 0, errors: 0, details: [] as string[] };

    try {
      const response = await fetch(NEUCE_JSON_URL);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const text = await response.text();
      const jsonStr = text.replace(/^var products=/, "").replace(/;$/, "");
      const products: NeuceProduct[] = JSON.parse(jsonStr);

      results.total = products.length;
      results.details.push(`Found ${products.length} products`);

      const batchSize = 50;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const records = batch.map((p) => {
          const name = p.title.trim();
          const category = extractCategory(p.f);
          return {
            name,
            category: `Pintura - ${category}`,
            description: p.subtitle?.trim() || null,
            keywords: buildKeywords(p),
            image_url: getImageUrl(p.image),
            internal_code: p.ref || null,
            price: getPrice(p.price),
            stock: parseInt(p.stock || "0", 10) || 0,
            stock_visible: true,
            active: false,
            featured: false,
            promotion_active: false,
            promotion_price: null,
            section: "Pintura",
            aisle: category,
            shelf: null,
            barcode: null,
          };
        });

        const { error } = await supabaseAdmin
          .from("products")
          .upsert(records, {
            onConflict: "internal_code",
            ignoreDuplicates: false,
          });

        if (error) {
          results.errors += records.length;
          results.details.push(`Batch ${Math.floor(i / batchSize) + 1} error: ${error.message}`);
        } else {
          results.inserted += records.length;
        }
      }

      results.details.push(
        `Done: ${results.inserted} processed, ${results.errors} errors`,
      );
    } catch (err) {
      results.errors++;
      results.details.push(
        `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return results;
  });
