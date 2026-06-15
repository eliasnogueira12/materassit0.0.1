import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAIProvider } from "@/lib/ai/factory";
import type { AIProvider } from "@/lib/ai/types";

const MsgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});
const Input = z.object({
  message: z.string().min(1).max(500),
  history: z.array(MsgSchema).max(20).optional(),
});

function lisbonNow() {
  const fmt = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const hour = parseInt(parts.hour ?? "0", 10);
  let greeting = "Boa noite";
  if (hour >= 5 && hour < 12) greeting = "Bom dia";
  else if (hour >= 12 && hour < 19) greeting = "Boa tarde";
  return { greeting, hour, time: `${parts.hour}:${parts.minute}`, weekday: parts.weekday };
}

export type RecommendedProduct = {
  id: string;
  name: string;
  category: string | null;
  location: string;
  price: number | null;
  promotion: number | null;
  stock: number | null;
  image_url: string | null;
  description: string | null;
};

// Memory Cache for DB catalog to speed up requests
let cachedCatalog: any = null;
let cachedProductMap: Map<string, any> | null = null;
let cacheTimestamp = 0;
let cachePromise: Promise<{ catalog: any; productMap: Map<string, any> }> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchCatalog() {
  const [{ data: products = [] }, { data: problems = [] }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select(
        "id,name,category,section,aisle,shelf,description,keywords,stock,stock_visible,price,promotion_price,promotion_active,featured,internal_code,image_url",
      )
      .eq("active", true)
      .limit(500),
    supabaseAdmin
      .from("problems")
      .select("id,title,category,description,solution,safety_warning,keywords")
      .eq("active", true)
      .limit(200),
  ]);

  const productMap: Map<string, any> = new Map((products ?? []).map((p: any) => [p.id, p]));

  const catalog = {
    products: (products ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      location: [p.section, p.aisle, p.shelf].filter(Boolean).join(" · "),
      description: p.description,
      keywords: p.keywords,
      stock: p.stock_visible ? p.stock : null,
      price: p.price,
      promotion: p.promotion_active && p.promotion_price != null ? p.promotion_price : null,
      featured: p.featured,
      code: p.internal_code,
      has_image: !!p.image_url,
    })),
    problems: (problems ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      description: p.description,
      solution: p.solution,
      safety: p.safety_warning,
      keywords: p.keywords,
    })),
  };

  cachedCatalog = catalog;
  cachedProductMap = productMap;
  cacheTimestamp = Date.now();
  return { catalog, productMap };
}

function getCachedCatalog() {
  const now = Date.now();
  if (cachedCatalog && cachedProductMap && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return Promise.resolve({ catalog: cachedCatalog, productMap: cachedProductMap });
  }
  if (!cachePromise || (cacheTimestamp && (now - cacheTimestamp >= CACHE_TTL_MS))) {
    cachePromise = fetchCatalog();
  }
  return cachePromise!;
}

function searchLocalCatalog(queryText: string, catalog: { products: any[]; problems: any[] }) {
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizedQuery = normalize(queryText);
  let queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);

  if (queryWords.length === 0) {
    return { reply: "Não consegui compreender a sua pesquisa. Tente descrever o problema ou o produto que procura com outras palavras.", products: [], matchedProductIds: [] };
  }

  // Extract bigrams for phrase-level matching
  const bigrams: string[] = [];
  for (let i = 0; i < queryWords.length - 1; i++) {
    bigrams.push(queryWords[i] + " " + queryWords[i + 1]);
  }

  function phraseScore(text: string, words: string[], grams: string[]): number {
    let s = 0;
    const t = normalize(text);
    // Exact phrase match (highest)
    if (grams.some(g => t.includes(g))) s += 8;
    // Partial word matches (prefix)
    words.forEach(w => {
      if (t.includes(w)) s += 4;
      else {
        // Partial prefix match for typos / fragments
        const parts = t.split(/\s+/);
        if (parts.some(p => p.startsWith(w) || w.startsWith(p))) s += 2;
      }
    });
    return s;
  }

  // Search Products
  const matchedProducts = catalog.products.map(p => {
    const nm = normalize(p.name || "");
    const desc = normalize(p.description || "");
    const cat = normalize(p.category || "");
    const kw = normalize(p.keywords || "");
    const code = normalize(p.code || "");

    let score = 0;
    score += phraseScore(nm, queryWords, bigrams) * 3;  // name weight 3x
    score += phraseScore(code, queryWords, bigrams) * 3;
    score += phraseScore(cat, queryWords, bigrams) * 2;
    score += phraseScore(kw, queryWords, bigrams) * 1.5;
    score += phraseScore(desc, queryWords, bigrams) * 1;

    // Category boost: if product category matches any query word
    if (cat && queryWords.some(w => w.length > 2 && cat.includes(w))) score += 2;

    return { product: p, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score);

  // Search Problems
  const matchedProblems = catalog.problems.map(p => {
    const title = normalize(p.title || "");
    const desc = normalize(p.description || "");
    const cat = normalize(p.category || "");
    const sol = normalize(p.solution || "");
    const kw = normalize(p.keywords || "");

    let score = 0;
    score += phraseScore(title, queryWords, bigrams) * 3;
    score += phraseScore(cat, queryWords, bigrams) * 2;
    score += phraseScore(kw, queryWords, bigrams) * 2;
    score += phraseScore(desc, queryWords, bigrams) * 1.5;
    score += phraseScore(sol, queryWords, bigrams) * 1;

    return { problem: p, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score);

  const matchedProductIds = matchedProducts.map(item => item.product.id);

  // No matches
  if (matchedProducts.length === 0 && matchedProblems.length === 0) {
    return {
      reply: "Não encontrei nada no catálogo para a sua pesquisa. 😔 Tente usar outras palavras ou clique no botão para chamar um funcionário.",
      products: [],
      matchedProductIds: [],
    };
  }

  const nProds = matchedProducts.length;
  const nProbs = matchedProblems.length;

  // Build natural response
  const lines: string[] = [];

  if (nProbs > 0 && nProds > 0) {
    lines.push(`Encontrei ${nProds > 1 ? `${nProds} produtos` : "um produto"} e ${nProbs > 1 ? `${nProbs} guias práticos` : "um guia prático"} relacionados com a sua pesquisa:`);
  } else if (nProbs > 0) {
    lines.push(`Encontrei ${nProbs > 1 ? `${nProbs} guias práticos` : "um guia prático"} que pode ajudar:`);
  } else {
    lines.push(`Encontrei ${nProds > 1 ? `${nProds} produtos` : "um produto"} que correspondem à sua pesquisa:`);
  }

  if (matchedProblems.length > 0) {
    lines.push("");
    matchedProblems.slice(0, 2).forEach(item => {
      const p = item.problem;
      lines.push(`💡 ${p.title}`);
      if (p.description) lines.push(`  → ${p.description}`);
      if (p.solution) lines.push(`  ✅ ${p.solution}`);
      if (p.safety) lines.push(`  ⚠️ ${p.safety}`);
      lines.push("");
    });
  }

  const productsToRecommend: any[] = [];
  if (matchedProducts.length > 0) {
    matchedProducts.slice(0, 4).forEach(item => {
      const p = item.product;
      const price = p.promotion != null
        ? `€${Number(p.promotion).toFixed(2)} (em promoção, €${Number(p.price).toFixed(2)})`
        : p.price != null ? `€${Number(p.price).toFixed(2)}` : "preço sob consulta";
      const loc = p.location ? `corredor ${p.location}` : null;
      const st = p.stock != null
        ? (p.stock > 0 ? `stock: ${p.stock} un.` : "stock indisponível")
        : null;
      const details = [price, loc, st].filter(Boolean).join(" · ");
      lines.push(`📦 **${p.name}** — ${details}`);
      productsToRecommend.push(p);
    });
  }

  lines.push("");
  if (nProds > 0) {
    lines.push("Os produtos aparecem em cartões abaixo. Precisa de mais alguma coisa?");
  } else {
    lines.push("Se precisar de ajuda presencial, clique em 'Chamar Funcionário'.");
  }

  return {
    reply: lines.join("\n"),
    products: productsToRecommend,
    matchedProductIds,
  };
}

function toRecommended(products: any[], productMap: Map<string, any>): RecommendedProduct[] {
  return products.map((p: any) => {
    const full = productMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      location: p.location,
      price: p.price != null ? Number(p.price) : null,
      promotion: p.promotion != null ? Number(p.promotion) : null,
      stock: p.stock,
      image_url: full?.image_url ?? null,
      description: p.description ?? null,
    };
  });
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { catalog, productMap } = await getCachedCatalog();
    const { greeting, time, weekday } = lisbonNow();

    // Detect AI availability once — if no API key is configured, skip AI entirely
    let provider: AIProvider | null = null;
    try {
      provider = getAIProvider();
    } catch {
      /* No AI provider configured — independent local mode */
    }

    if (!provider) {
      const localResults = searchLocalCatalog(data.message, catalog);
      return {
        reply: localResults.reply,
        greeting,
        products: toRecommended(localResults.products, productMap),
      };
    }

    // === SMART AI MODE (only injects matched products — faster, cheaper, focused) ===
    const localResults = searchLocalCatalog(data.message, catalog);
    const ctxProds = localResults.matchedProductIds.length > 0
      ? localResults.matchedProductIds.map(id => productMap.get(id)).filter(Boolean)
      : catalog.products.slice(0, 8);
    const ctxProbs = localResults.products.length === 0 && catalog.problems.length > 0
      ? catalog.problems.slice(0, 5)
      : [];

    const system = `És o MaterAssist da MarquesMater (construção, bricolage, tintas, jardinagem em Portugal). Fala Português de Portugal de forma natural e conversacional.

Data/Hora: ${greeting} · ${time} · ${weekday}. Usa "${greeting}" só na primeira resposta.

Contexto atual da pesquisa do cliente (apenas produtos e guias relevantes):
${JSON.stringify(ctxProds)}
${ctxProbs.length > 0 ? `Guias relacionados:\n${JSON.stringify(ctxProbs)}` : ""}

Regras:
- Responde com empatia e conhecimento prático.
- Se recomendares produtos, usa a ferramenta "recommend_products" com os IDs respetivos.
- Nunca inventes produtos, marcas ou preços.
- Se não houver correspondência no catálogo, sugere chamar um funcionário.`;

    const history = (data.history ?? []).slice(-10);

    const tools = [
      {
        type: "function",
        function: {
          name: "recommend_products",
          description: "Lista de IDs de produtos do catálogo recomendados nesta resposta, pela ordem em que aparecem.",
          parameters: {
            type: "object",
            properties: {
              product_ids: {
                type: "array",
                items: { type: "string" },
                description: "IDs (uuid) de produtos do catálogo.",
              },
            },
            required: ["product_ids"],
            additionalProperties: false,
          },
        },
      },
    ];

    let reply = "Sem resposta.";
    let toolCalls: any[] = [];
    let useLocalFallback = false;

    try {
      const result = await provider.sendMessage({
        systemPrompt: system,
        message: data.message,
        history,
        tools: localResults.matchedProductIds.length === 0 ? [] : tools,
      });
      reply = result.reply;
      toolCalls = result.toolCalls ?? [];
    } catch (err: any) {
      console.error("[askAssistant] AI execution failed, initiating local fallback:", err);
      useLocalFallback = true;
    }

    if (useLocalFallback) {
      return { reply: localResults.reply, greeting, products: toRecommended(localResults.products, productMap) };
    }

    const recommended: RecommendedProduct[] = [];
    const seen = new Set<string>();

    for (const call of toolCalls) {
      if (call?.function?.name !== "recommend_products") continue;
      try {
        const args = JSON.parse(call.function.arguments ?? "{}");
        const ids: string[] = Array.isArray(args.product_ids) ? args.product_ids : [];
        for (const id of ids) {
          if (seen.has(id)) continue;
          const p = productMap.get(id);
          if (!p) continue;
          seen.add(id);
          recommended.push({
            id: p.id,
            name: p.name,
            category: p.category,
            location: [p.section, p.aisle, p.shelf].filter(Boolean).join(" · "),
            price: p.price != null ? Number(p.price) : null,
            promotion:
              p.promotion_active && p.promotion_price != null ? Number(p.promotion_price) : null,
            stock: p.stock_visible ? p.stock : null,
            image_url: p.image_url ?? null,
            description: p.description ?? null,
          });
        }
      } catch {
        /* ignore malformed tool call */
      }
    }

    return { reply, greeting, products: recommended };
  });
