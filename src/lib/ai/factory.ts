import { AIProvider } from "./types";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";
import { ClaudeProvider } from "./claude-provider";
import { GroqProvider } from "./groq-provider";

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  const openAiApiKey = process.env.OPENAI_API_KEY || "";
  const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "";
  const groqApiKey = process.env.GROQ_API_KEY || "";

  // 1) Explicit provider selection
  if (providerType === "gemini") {
    if (!geminiApiKey) {
      throw new Error(
        "Variável AI_PROVIDER definida para 'gemini', mas GEMINI_API_KEY não foi configurada.",
      );
    }
    return new GeminiProvider(geminiApiKey);
  }
  if (providerType === "openai") {
    if (!openAiApiKey) {
      throw new Error(
        "Variável AI_PROVIDER definida para 'openai', mas OPENAI_API_KEY não foi configurada.",
      );
    }
    return new OpenAIProvider(openAiApiKey);
  }
  if (providerType === "claude") {
    if (!claudeApiKey) {
      throw new Error(
        "Variável AI_PROVIDER definida para 'claude', mas CLAUDE_API_KEY ou ANTHROPIC_API_KEY não foi configurada.",
      );
    }
    return new ClaudeProvider(claudeApiKey);
  }
  if (providerType === "groq") {
    if (!groqApiKey) {
      throw new Error(
        "Variável AI_PROVIDER definida para 'groq', mas GROQ_API_KEY não foi configurada.",
      );
    }
    return new GroqProvider(groqApiKey);
  }

  // 2) Automatic detection cascade
  if (geminiApiKey) {
    return new GeminiProvider(geminiApiKey);
  }
  if (groqApiKey) {
    return new GroqProvider(groqApiKey);
  }
  if (openAiApiKey) {
    return new OpenAIProvider(openAiApiKey);
  }
  if (claudeApiKey) {
    return new ClaudeProvider(claudeApiKey);
  }

  // 3) Fatal configuration error
  throw new Error(
    "Nenhum fornecedor de Inteligência Artificial configurado. Por favor, adicione GEMINI_API_KEY no ficheiro .env para ativar o assistente.",
  );
}
