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

    let attempts = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timeoutMs = attempt === 1 ? 5000 : 7000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
          console.warn(`[GeminiProvider] attempt ${attempt} status ${res.status}:`, errorText);
          if (res.status < 500) throw new Error(`Gemini ${res.status}: ${errorText || res.statusText}`);
          throw new Error(`Gemini ${res.status}`);
        }

        const json = await res.json();
        const choice = json?.choices?.[0];
        const reply = choice?.message?.content ?? "";
        const toolCalls = choice?.message?.tool_calls ?? [];

        return { reply, toolCalls };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        console.warn(`[GeminiProvider] attempt ${attempt}:`, err.message);
        if (attempt < attempts) await new Promise((r) => setTimeout(r, 300));
      }
    }

    throw lastError || new Error("Gemini API falhou após 2 tentativas.");
  }
}
