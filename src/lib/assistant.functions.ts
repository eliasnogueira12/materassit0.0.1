import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAIProvider } from "@/lib/ai/factory";

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
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

async function getCachedCatalog() {
  const now = Date.now();
  if (cachedCatalog && cachedProductMap && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return { catalog: cachedCatalog, productMap: cachedProductMap };
  }

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

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const catalog = {
    products: (products ?? []).map((p) => ({
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
    problems: (problems ?? []).map((p) => ({
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
  cacheTimestamp = now;

  return { catalog, productMap };
}

function searchLocalCatalog(queryText: string, catalog: { products: any[]; problems: any[] }) {
  // Normalize string for comparison: lowercase, remove accents, remove punctuation
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ")
      .trim();
  };

  const normalizedQuery = normalize(queryText);
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);

  if (queryWords.length === 0) {
    return {
      reply: "Lamento, não consegui compreender a sua pesquisa. Por favor, tente descrever o problema ou o produto que procura com outras palavras.",
      products: []
    };
  }

  // Common stop words in Portuguese to ignore
  const stopWords = new Set(["o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "para", "por", "com", "sem", "ou", "e", "que", "se", "como", "mais", "tem", "têm", "quero", "procura", "preciso", "gostaria", "saber"]);

  const searchWords = queryWords.filter(w => !stopWords.has(w));
  const activeWords = searchWords.length > 0 ? searchWords : queryWords;

  // Search Products
  const matchedProducts = catalog.products.map(p => {
    let score = 0;
    const nameNorm = normalize(p.name || "");
    const descNorm = normalize(p.description || "");
    const catNorm = normalize(p.category || "");
    const keywordsNorm = normalize(p.keywords || "");
    const codeNorm = normalize(p.code || "");

    activeWords.forEach(word => {
      // High score for exact match in name or code
      if (nameNorm.includes(word)) score += 5;
      if (codeNorm.includes(word)) score += 10;
      if (catNorm.includes(word)) score += 3;
      if (keywordsNorm.includes(word)) score += 2;
      if (descNorm.includes(word)) score += 1;
    });

    return { product: p, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score);

  // Search Problems
  const matchedProblems = catalog.problems.map(p => {
    let score = 0;
    const titleNorm = normalize(p.title || "");
    const descNorm = normalize(p.description || "");
    const catNorm = normalize(p.category || "");
    const solutionNorm = normalize(p.solution || "");
    const keywordsNorm = normalize(p.keywords || "");

    activeWords.forEach(word => {
      if (titleNorm.includes(word)) score += 5;
      if (catNorm.includes(word)) score += 3;
      if (keywordsNorm.includes(word)) score += 2;
      if (descNorm.includes(word)) score += 2;
      if (solutionNorm.includes(word)) score += 2;
    });

    return { problem: p, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score);

  // If no matches found
  if (matchedProducts.length === 0 && matchedProblems.length === 0) {
    return {
      reply: "Pedimos desculpa, mas estamos temporariamente com dificuldades de ligação e não conseguimos encontrar informações locais para a sua pesquisa. 😔\n\nPor favor, utilize o botão abaixo para chamar um funcionário para assistência presencial na loja.",
      products: []
    };
  }

  // Format response in PT-PT
  let reply = "⚠️ *[Modo de Emergência Ativo - Ligação Temporária]*\n";
  reply += "Lamento, mas estou temporariamente com dificuldades em contactar o meu sistema central. Ativei o motor de pesquisa local MarquesMater para ajudá-lo de imediato com base no nosso catálogo.\n\n";

  // List problems
  if (matchedProblems.length > 0) {
    reply += "💡 **Tutoriais e Resolução de Problemas Encontrados:**\n";
    matchedProblems.slice(0, 2).forEach(item => {
      const p = item.problem;
      reply += `• **${p.title}** (${p.category || "Geral"})\n`;
      if (p.description) reply += `  *O que é:* ${p.description}\n`;
      if (p.solution) reply += `  *Solução:* ${p.solution}\n`;
      if (p.safety) reply += `  *⚠️ Aviso de Segurança:* ${p.safety}\n`;
      reply += "\n";
    });
  }

  // List products
  const productsToRecommend: any[] = [];
  if (matchedProducts.length > 0) {
    reply += "📦 **Produtos Relacionados no Catálogo:**\n";
    matchedProducts.slice(0, 4).forEach(item => {
      const p = item.product;
      const priceText = p.promotion != null 
        ? `€${Number(p.promotion).toFixed(2)} (Promoção, antes €${Number(p.price).toFixed(2)})` 
        : p.price != null ? `€${Number(p.price).toFixed(2)}` : "Preço sob consulta";
      
      reply += `• **${p.name}**\n`;
      reply += `  - Corredor/Localização: ${p.location || "Consultar equipa"}\n`;
      reply += `  - Preço: ${priceText}\n`;
      if (p.stock != null) {
        reply += `  - Stock: ${p.stock > 0 ? `${p.stock} unidades disponíveis` : "Sem stock de momento (consulte um funcionário)"}\n`;
      }
      reply += "\n";
      productsToRecommend.push(p);
    });
  }

  reply += "Adicionei estes produtos em cartões abaixo para sua conveniência. Se desejar saber mais ou chamar ajuda física, clique no botão 'Chamar Funcionário'.";

  return {
    reply,
    products: productsToRecommend
  };
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { catalog, productMap } = await getCachedCatalog();

    const { greeting, time, weekday } = lisbonNow();
    const catalogEmpty = catalog.products.length === 0 && catalog.problems.length === 0;

    const system = `És o MaterAssist — o assistente virtual e consultor especializado da loja MarquesMater (artigos de construção, bricolage, tintas e jardinagem em Portugal). O teu objetivo é ajudar os clientes de forma simpática, prestável, profissional e altamente qualificada.

Fala SEMPRE em Português de Portugal (pt-PT), de forma natural, fluida e conversacional. Evita respostas robóticas ou genéricas. Explica conceitos de forma simples e direta, utilizando exemplos práticos quando apropriado.

=== INFORMAÇÃO TEMPORAL ===
Data/Hora atual: ${greeting} · ${time} · ${weekday}. Cumprimenta com "${greeting}" apenas na primeira mensagem da conversa.

=== BASE DE CONHECIMENTO AUTÓNOMA (Única Fonte de Verdade) ===
Tens acesso direto a todo o catálogo de produtos e problemas (FAQ/tutoriais) da loja. Analisa estes dados para responder:

1. CATÁLOGO DE PRODUTOS:
${JSON.stringify(catalog.products)}

2. PROBLEMAS E TUTORIAIS (FAQ):
${JSON.stringify(catalog.problems)}

=== CAPACIDADES E INSTRUÇÕES DE RESPOSTA ===
- CONSELHOS E SOLUÇÃO DE PROBLEMAS: Quando o cliente descreve um problema (ex: "tenho folhas amarelas", "torneira a pingar", "humidade na parede"), diagnostica possíveis causas de forma inteligente (ex: excesso de rega, falta de ferro, pragas, etc.) e propõe soluções práticas com base nos tutoriais e produtos em catálogo.
- RECOMENDAÇÃO INTELIGENTE DE PRODUTOS: Recomenda produtos específicos que resolvam o problema do cliente ou que correspondam diretamente ao que ele procura (ex: "Qual o melhor fertilizante para tomateiros?"). Explica o porquê de cada recomendação com base nas descrições, características e utilidade de cada artigo.
- COMPARAÇÃO DE PRODUTOS: Se o cliente hesitar ou perguntar, compara produtos diferentes (preços, características, stocks, vantagens e desvantagens) e sugere alternativas viáveis e adequadas ao orçamento/necessidade.
- INFORMAÇÕES DO PRODUTO: Utiliza os preços reais, stocks (se disponível) e localizações físicas (secção, corredor, prateleira) para orientar o cliente. Se o stock for baixo ou nulo, avisa com simpatia.
- LIMITES DO CATÁLOGO: Nunca inventes produtos, marcas ou preços. Se não encontrares nenhum produto correspondente para o que o cliente quer, sugere que ele chame um funcionário utilizando o botão no ecrã.

=== REGRA DE OURO PARA PRODUTOS INTERATIVOS ===
Sempre que recomendares produtos do catálogo no teu texto:
1. Explica textualmente o porquê de os estares a sugerir.
2. No final, deves obrigatoriamente chamar a tool "recommend_products" passando os IDs dos produtos recomendados (em ordem de relevância). O sistema irá desenhar cartões visuais premium com imagem, preço, stock e localização física dos produtos logo abaixo do teu texto. Não precisas de repetir exaustivamente esses dados no texto.

Comporta-te como um verdadeiro consultor humano experiente da loja!`;

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
      const provider = getAIProvider();
      const result = await provider.sendMessage({
        systemPrompt: system,
        message: data.message,
        history,
        tools: catalogEmpty ? [] : tools,
      });
      reply = result.reply;
      toolCalls = result.toolCalls ?? [];
    } catch (err: any) {
      console.error("[askAssistant] AI execution failed, initiating local fallback:", err);
      useLocalFallback = true;
    }

    if (useLocalFallback) {
      const localResults = searchLocalCatalog(data.message, catalog);
      const recommended: RecommendedProduct[] = localResults.products.map((p: any) => {
        const fullProduct = productMap.get(p.id);
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          location: p.location,
          price: p.price != null ? Number(p.price) : null,
          promotion: p.promotion != null ? Number(p.promotion) : null,
          stock: p.stock,
          image_url: fullProduct?.image_url ?? null,
          description: p.description ?? null,
        };
      });
      return { reply: localResults.reply, greeting, products: recommended };
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
