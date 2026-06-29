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
  skipProductIds: z.array(z.string()).max(100).optional(),
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
  if (cachedCatalog && cachedProductMap && now - cacheTimestamp < CACHE_TTL_MS) {
    return Promise.resolve({ catalog: cachedCatalog, productMap: cachedProductMap });
  }
  if (!cachePromise || (cacheTimestamp && now - cacheTimestamp >= CACHE_TTL_MS)) {
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
  let queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 1);

  if (queryWords.length === 0) {
    return {
      reply:
        "Não consegui compreender a sua pesquisa. Tente descrever o problema ou o produto que procura com outras palavras.",
      products: [],
      matchedProductIds: [],
    };
  }

  // Portuguese stemmer — gera variantes de cada palavra
  function expandWord(w: string): string[] {
    const v = [w];
    if (w.length <= 3) return v;
    const last2 = w.slice(-2),
      last3 = w.slice(-3);
    // Plural -> singular
    if (w.endsWith("s") && !w.endsWith("ss")) {
      const sing = w.slice(0, -1);
      v.push(sing);
      if (sing.endsWith("a") || sing.endsWith("o")) v.push(sing.slice(0, -1));
      if (last2 === "es") v.push(w.slice(0, -2));
      if (last2 === "is") v.push(w.slice(0, -2));
      if (last3 === "oes") v.push(w.slice(0, -3) + "ao");
      if (last3 === "ais") v.push(w.slice(0, -3) + "al");
      if (last3 === "eis") v.push(w.slice(0, -3) + "el");
    }
    // Feminino -> masculino / neutro
    if (w.endsWith("a")) v.push(w.slice(0, -1) + "o");
    if (w.endsWith("o")) v.push(w.slice(0, -1) + "a");
    // Verbos: -ar, -er, -ir -> raiz
    if (last2 === "ar" || last2 === "er" || last2 === "ir") v.push(w.slice(0, -2));
    if (w.endsWith("ando") || w.endsWith("endo") || w.endsWith("indo")) v.push(w.slice(0, -3));
    if (w.endsWith("ado") || w.endsWith("ido")) v.push(w.slice(0, -3));
    // -ção -> -ção/-çoar
    if (last3 === "cao") v.push(w.slice(0, -3) + "c");
    return [...new Set(v)];
  }

  function lemmaMatch(word: string, text: string): boolean {
    const variants = expandWord(word);
    const textWords = text.split(/\s+/);
    return variants.some((v) => textWords.some((tw) => tw.includes(v) || v.includes(tw)));
  }

  // Expand query words com todas as variantes
  const allQueryWords = queryWords.flatMap((w) => expandWord(w));
  const uniqueQueryWords = [...new Set(allQueryWords)];

  // Extract bigrams for phrase-level matching
  const bigrams: string[] = [];
  for (let i = 0; i < queryWords.length - 1; i++) {
    bigrams.push(queryWords[i] + " " + queryWords[i + 1]);
  }

  function phraseScore(text: string, words: string[], grams: string[]): number {
    let s = 0;
    const t = normalize(text);
    if (grams.some((g) => t.includes(g))) s += 8;
    words.forEach((w) => {
      if (t.includes(w) || lemmaMatch(w, t)) s += 4;
      else {
        const parts = t.split(/\s+/);
        if (parts.some((p) => p.startsWith(w) || w.startsWith(p))) s += 2;
      }
    });
    return s;
  }

  // Search Products
  const matchedProducts = catalog.products
    .map((p) => {
      const nm = normalize(p.name || "");
      const desc = normalize(p.description || "");
      const cat = normalize(p.category || "");
      const kw = normalize(p.keywords || "");
      const code = normalize(p.code || "");

      let score = 0;
      score += phraseScore(nm, uniqueQueryWords, bigrams) * 3;
      score += phraseScore(code, uniqueQueryWords, bigrams) * 3;
      score += phraseScore(cat, uniqueQueryWords, bigrams) * 2;
      score += phraseScore(kw, uniqueQueryWords, bigrams) * 1.5;
      score += phraseScore(desc, uniqueQueryWords, bigrams) * 1;

      if (cat && uniqueQueryWords.some((w) => w.length > 2 && cat.includes(w))) score += 2;

      return { product: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Search Problems
  const matchedProblems = catalog.problems
    .map((p) => {
      const title = normalize(p.title || "");
      const desc = normalize(p.description || "");
      const cat = normalize(p.category || "");
      const sol = normalize(p.solution || "");
      const kw = normalize(p.keywords || "");

      let score = 0;
      score += phraseScore(title, uniqueQueryWords, bigrams) * 3;
      score += phraseScore(cat, uniqueQueryWords, bigrams) * 2;
      score += phraseScore(kw, uniqueQueryWords, bigrams) * 2;
      score += phraseScore(desc, uniqueQueryWords, bigrams) * 1.5;
      score += phraseScore(sol, uniqueQueryWords, bigrams) * 1;

      return { problem: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const matchedProductIds = matchedProducts.map((item) => item.product.id);

  // No matches
  if (matchedProducts.length === 0 && matchedProblems.length === 0) {
    return {
      reply:
        "Não encontrei nada no catálogo para a sua pesquisa. 😔 Tente usar outras palavras ou clique no botão para chamar um funcionário.",
      products: [],
      matchedProductIds: [],
    };
  }

  const nProds = matchedProducts.length;
  const nProbs = matchedProblems.length;

  // Build natural response
  const lines: string[] = [];

  if (nProbs > 0 && nProds > 0) {
    lines.push(
      `Encontrei ${nProds > 1 ? `${nProds} produtos` : "um produto"} e ${nProbs > 1 ? `${nProbs} guias práticos` : "um guia prático"} relacionados com a sua pesquisa:`,
    );
  } else if (nProbs > 0) {
    lines.push(
      `Encontrei ${nProbs > 1 ? `${nProbs} guias práticos` : "um guia prático"} que pode ajudar:`,
    );
  } else {
    lines.push(
      `Encontrei ${nProds > 1 ? `${nProds} produtos` : "um produto"} que correspondem à sua pesquisa:`,
    );
  }

  if (matchedProblems.length > 0) {
    lines.push("");
    matchedProblems.slice(0, 2).forEach((item) => {
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
    matchedProducts.slice(0, 4).forEach((item) => {
      const p = item.product;
      const price =
        p.promotion != null
          ? `€${Number(p.promotion).toFixed(2)} (em promoção, era €${Number(p.price).toFixed(2)})`
          : p.price != null
            ? `€${Number(p.price).toFixed(2)}`
            : "preço sob consulta";
      const loc = p.location ? `corredor ${p.location}` : null;
      const st =
        p.stock != null ? (p.stock > 0 ? `stock: ${p.stock} un.` : "stock indisponível") : null;
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

function parseTextToolCalls(reply: string): { cleanedReply: string; toolCalls: any[] } {
  const toolCalls: any[] = [];
  let cleanedReply = reply;

  // Regex for <function=name>args</function>
  const regex = /<function=([\w_-]+)>([\s\S]*?)<\/function>/gi;
  let match;
  
  while ((match = regex.exec(reply)) !== null) {
    const name = match[1];
    const argsStr = match[2].trim();
    toolCalls.push({
      type: "function",
      function: {
        name,
        arguments: argsStr,
      },
    });
  }

  // Remove the tags from the reply
  cleanedReply = cleanedReply.replace(regex, "").trim();
  // Clean up any double empty lines left by the removal
  cleanedReply = cleanedReply.replace(/\n{3,}/g, "\n\n");

  return { cleanedReply, toolCalls };
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { catalog, productMap } = await getCachedCatalog();
    const { greeting, time, weekday } = lisbonNow();

    let provider: AIProvider | null = null;
    try {
      provider = getAIProvider();
    } catch {
      /* no provider configured — use local search */
    }

    const skipSet = new Set(data.skipProductIds ?? []);
    function filterSkipped(products: any[]) {
      return products.filter((p: any) => !skipSet.has(p.id));
    }

    const localResults = searchLocalCatalog(data.message, catalog);
    localResults.products = filterSkipped(localResults.products);
    localResults.matchedProductIds = localResults.matchedProductIds.filter(
      (id) => !skipSet.has(id),
    );

    if (!provider) {
      return {
        reply: localResults.reply,
        greeting,
        products: toRecommended(localResults.products, productMap),
        addToCart: [],
      };
    }

    const hasMatches = localResults.matchedProductIds.length > 0;
    const ctxProds = hasMatches
      ? localResults.matchedProductIds.map((id) => productMap.get(id)).filter(Boolean)
      : [];
    const topProds = ctxProds
      .slice(0, 8)
      .map((p, i) => {
        const price =
          p.promotion_active && p.promotion_price != null
            ? `${Number(p.promotion_price).toFixed(2)}€ (em promoção, era ${Number(p.price).toFixed(2)}€)`
            : p.price != null
              ? `${Number(p.price).toFixed(2)}€`
              : "preço sob consulta";
        const loc = [p.section, p.aisle, p.shelf].filter(Boolean).join(" · ");
        const desc = p.description ? ` — ${p.description}` : "";
        const stockInfo = p.stock_visible && p.stock != null ? ` (stock: ${p.stock} un.)` : "";
        return `${i + 1}. [ID:${p.id}] ${p.name} — ${price}${loc ? `, ${loc}` : ""}${desc}${stockInfo}`;
      })
      .join("\n");

    const history = (data.history ?? []).slice(-10);
    const system = `Tu és o MaterAssist, assistente virtual da MarquesMater (construção, bricolage, jardinagem em Portugal). Funcionas como um funcionário experiente e simpático da loja.

${greeting}! São ${time} de ${weekday}.

${
  hasMatches
    ? `CATÁLOGO (produtos relacionados):
${topProds}`
    : "A pesquisa no catálogo não encontrou correspondência direta para o pedido."
}

REGRAS:
- Responde em português de Portugal, natural e conversacional.
- Explica diferenças entre produtos, como usar, e recomenda o mais adequado.
- Quando recomendares produtos, usa a ferramenta "recommend_products" com os IDs corretos (formato [ID:uuid] no catálogo).
- Sê prático: nome do produto, preço, localização (corredor).
- No final da resposta, pergunta sempre se o cliente quer adicionar algum produto ao carrinho.
- Se o cliente disser que quer um produto específico, usa a ferramenta "add_to_cart" com o product_id (o UUID que aparece como [ID:...] no catálogo) e informa o cliente que já foi adicionado ao carrinho.
- NÃO perguntes se o cliente quer adicionar ao carrinho DEPOIS de já o teres adicionado — informa apenas que foi adicionado.
- Se não houver nada no catálogo para ajudar, sê honesto e sugere chamar um funcionário.`;

    try {
      const tools =
        localResults.matchedProductIds.length === 0
          ? []
          : [
              {
                type: "function",
                function: {
                  name: "recommend_products",
                  description: "IDs dos produtos recomendados nesta resposta.",
                  parameters: {
                    type: "object",
                    properties: {
                      product_ids: {
                        type: "array",
                        items: { type: "string" },
                        description: "UUIDs dos produtos.",
                      },
                    },
                    required: ["product_ids"],
                    additionalProperties: false,
                  },
                },
              },
              {
                type: "function",
                function: {
                  name: "add_to_cart",
                  description:
                    "Adiciona um produto ao carrinho do cliente. Usa esta ferramenta quando o cliente disser que quer comprar um produto específico.",
                  parameters: {
                    type: "object",
                    properties: {
                      product_id: {
                        type: "string",
                        description:
                          "UUID do produto. No catálogo aparece como [ID:...] — usa esse UUID exato.",
                      },
                      quantity: {
                        type: "integer",
                        description: "Quantidade (omitir se for 1).",
                        default: 1,
                      },
                    },
                    required: ["product_id"],
                    additionalProperties: false,
                  },
                },
              },
            ];

      const result = await provider.sendMessage({
        systemPrompt: system,
        message: data.message,
        history,
        tools,
      });

      // Parse any function tags embedded in the text reply (fallback for some models/APIs)
      const textParse = parseTextToolCalls(result.reply || "");
      const combinedToolCalls = [
        ...(result.toolCalls ?? []),
        ...textParse.toolCalls,
      ];
      const cleanedReply = textParse.cleanedReply;

      const recommended: RecommendedProduct[] = [];
      const addToCart: { productId: string; name: string; price: number; location: string }[] = [];
      const seen = new Set<string>();
      for (const call of combinedToolCalls) {
        if (call?.function?.name === "recommend_products") {
          try {
            const args = JSON.parse(call.function.arguments ?? "{}");
            for (const id of Array.isArray(args.product_ids) ? args.product_ids : []) {
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
                  p.promotion_active && p.promotion_price != null
                    ? Number(p.promotion_price)
                    : null,
                stock: p.stock_visible ? p.stock : null,
                image_url: p.image_url ?? null,
                description: p.description ?? null,
              });
            }
          } catch {
            /* skip */
          }
        } else if (call?.function?.name === "add_to_cart") {
          try {
            const args = JSON.parse(call.function.arguments ?? "{}");
            const pid = args.product_id;
            if (typeof pid === "string" && !seen.has(pid)) {
              const p = productMap.get(pid);
              if (p && p.price != null) {
                seen.add(pid);
                addToCart.push({
                  productId: p.id,
                  name: p.name,
                  price: Number(p.price),
                  location: [p.section, p.aisle, p.shelf].filter(Boolean).join(" · "),
                });
              }
            }
          } catch {
            /* skip */
          }
        }
      }

      return { reply: cleanedReply, greeting, products: recommended, addToCart };
    } catch {
      return {
        reply: localResults.reply,
        greeting,
        products: toRecommended(localResults.products, productMap),
        addToCart: [],
      };
    }
  });

export const setRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => {
    console.log("[setRequestStatus] inputValidator received:", JSON.stringify(d));
    return z
      .object({
        id: z.string(),
        status: z.enum(["accepted", "refused", "done", "expired", "attending"]),
      })
      .parse(d);
  })
  .handler(async ({ data }) => {
    console.log("[setRequestStatus] handler data:", JSON.stringify(data));
    const { id, status } = data;
    const patch: Record<string, unknown> = { status };
    if (status === "accepted") patch.accepted_at = new Date().toISOString();
    if (status === "done") patch.resolved_at = new Date().toISOString();
    console.log("[setRequestStatus] updating", id, "with", JSON.stringify(patch));
    const { error } = await supabaseAdmin
      .from("assistance_requests")
      .update(patch as any)
      .eq("id", id);
    if (error) {
      console.error("[setRequestStatus] supabase error:", error);
      throw error;
    }
    console.log("[setRequestStatus] success");
  });
