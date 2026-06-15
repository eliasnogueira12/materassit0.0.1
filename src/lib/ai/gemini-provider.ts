import { AIProvider, AIMessage } from "./types";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
  }) {
    // Call the official Google Gemini OpenAI-compatible endpoint
    const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    const messages = [
      { role: "system", content: params.systemPrompt },
      ...params.history,
      { role: "user", content: params.message },
    ];

    const body: any = {
      model: this.model,
      messages,
    };

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools;
    }

    let attempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      try {
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorText = await res.text();
          console.warn(`[GeminiProvider] Tentativa ${attempt} falhou com status ${res.status}:`, errorText);
          throw new Error(`Gemini API Error (${res.status}): ${errorText || res.statusText}`);
        }

        const json = await res.json();
        const choice = json?.choices?.[0];
        const reply = choice?.message?.content ?? "";
        const toolCalls = choice?.message?.tool_calls ?? [];

        return { reply, toolCalls };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        console.warn(`[GeminiProvider] Tentativa ${attempt} falhou:`, err.message);
        
        if (attempt < attempts) {
          const delay = attempt === 1 ? 250 : 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Falha na API Gemini após múltiplas tentativas.");
  }
}
