import { AIProvider } from "./types";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";
import { ClaudeProvider } from "./claude-provider";
import { GroqProvider } from "./groq-provider";
import { CloudflareProvider } from "./cloudflare-provider";

export class FallbackProvider implements AIProvider {
  private providers: AIProvider[];

  constructor(providers: AIProvider[]) {
    this.providers = providers;
  }

  async sendMessage(params: {
    systemPrompt: string;
    message: string;
    history: any[];
    tools?: any[];
  }) {
    let lastError: any = null;
    for (const provider of this.providers) {
      try {
        console.log(`[AI] Tentando enviar mensagem com o provedor: ${provider.constructor.name}`);
        return await provider.sendMessage(params);
      } catch (err: any) {
        console.warn(`[AI] Provedor ${provider.constructor.name} falhou:`, err.message || err);
        lastError = err;
      }
    }
    throw lastError || new Error("Todos os provedores de IA falharam.");
  }

  async sendMessageStream(params: {
    systemPrompt: string;
    message: string;
    history: any[];
    tools?: any[];
    onChunk: (chunk: string) => void;
    onToolCalls?: (calls: any[]) => void;
  }): Promise<string> {
    let lastError: any = null;
    for (const provider of this.providers) {
      if (!provider.sendMessageStream) continue;
      try {
        console.log(`[AI] Tentando stream com o provedor: ${provider.constructor.name}`);
        return await provider.sendMessageStream(params);
      } catch (err: any) {
        console.warn(`[AI] Provedor stream ${provider.constructor.name} falhou:`, err.message || err);
        lastError = err;
      }
    }
    throw lastError || new Error("Todos os provedores de stream de IA falharam.");
  }
}

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  const openAiApiKey = process.env.OPENAI_API_KEY || "";
  const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "";
  const groqApiKey = process.env.GROQ_API_KEY || "";
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN || "";

  const providers: AIProvider[] = [];

  function addProvider(type: string) {
    if (type === "gemini" && geminiApiKey) {
      providers.push(new GeminiProvider(geminiApiKey));
      return true;
    }
    if (type === "cloudflare" && cfAccountId && cfApiToken) {
      providers.push(new CloudflareProvider(cfAccountId, cfApiToken));
      return true;
    }
    if (type === "groq" && groqApiKey) {
      providers.push(new GroqProvider(groqApiKey));
      return true;
    }
    if (type === "openai" && openAiApiKey) {
      providers.push(new OpenAIProvider(openAiApiKey));
      return true;
    }
    if (type === "claude" && claudeApiKey) {
      providers.push(new ClaudeProvider(claudeApiKey));
      return true;
    }
    return false;
  }

  // 1) Add explicitly requested provider first
  if (providerType) {
    const added = addProvider(providerType);
    if (!added) {
      console.warn(`[AI] Provedor ${providerType} explicitamente configurado mas com chaves em falta.`);
    }
  }

  // 2) Add fallback options in priority order
  if (providerType !== "gemini") addProvider("gemini");
  if (providerType !== "cloudflare") addProvider("cloudflare");
  if (providerType !== "groq") addProvider("groq");
  if (providerType !== "openai") addProvider("openai");
  if (providerType !== "claude") addProvider("claude");

  if (providers.length === 0) {
    throw new Error(
      "Nenhum fornecedor de Inteligência Artificial configurado. Por favor, adicione GEMINI_API_KEY ou credenciais Cloudflare no ficheiro .env para ativar o assistente.",
    );
  }

  return new FallbackProvider(providers);
}
