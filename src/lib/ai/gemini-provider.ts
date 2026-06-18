import { AIProvider, AIMessage } from "./types";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.5-pro") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private buildBody(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
  }, stream = false) {
    const messages = [
      { role: "system", content: params.systemPrompt },
      ...params.history,
      { role: "user", content: params.message },
    ];

    const body: any = { model: this.model, messages };
    if (params.tools && params.tools.length > 0) body.tools = params.tools;
    if (stream) body.stream = true;
    return body;
  }

  async sendMessage(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
  }) {
    const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const body = this.buildBody(params, false);

    let attempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timeoutMs = attempt === 1 ? 8000 : 12000;
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
          if (res.status === 429) {
            const delayMs = attempt < attempts ? 5000 : 0;
            if (delayMs > 0) {
              console.warn(`[GeminiProvider] rate limited, retrying in ${delayMs}ms`);
              await new Promise((r) => setTimeout(r, delayMs));
              continue;
            }
          } else if (res.status >= 500) {
            if (attempt < attempts) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
          }
          throw new Error(`Gemini ${res.status}: ${errorText || res.statusText}`);
        }

        const json = await res.json();
        const choice = json?.choices?.[0];
        const reply = choice?.message?.content ?? "";
        const toolCalls = choice?.message?.tool_calls ?? [];

        return { reply, toolCalls };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          console.warn(`[GeminiProvider] attempt ${attempt} timed out`);
          if (attempt < attempts) continue;
        }
        lastError = err;
        console.warn(`[GeminiProvider] attempt ${attempt}:`, err.message);
      }
    }

    throw lastError || new Error("Gemini API falhou após tentativas.");
  }

  async sendMessageStream(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
    onChunk: (chunk: string) => void;
    onToolCalls?: (calls: any[]) => void;
  }): Promise<string> {
    const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const body = this.buildBody(params, true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let fullReply = "";

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
        throw new Error(`Gemini ${res.status}: ${errorText || res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") break;

          try {
            const json = JSON.parse(jsonStr);
            const delta = json?.choices?.[0]?.delta;
            if (delta?.content) {
              fullReply += delta.content;
              params.onChunk(delta.content);
            }
            if (delta?.tool_calls) {
              params.onToolCalls?.(delta.tool_calls);
            }
          } catch {
            /* skip malformed chunk */
          }
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") throw new Error("Gemini streaming timeout após 15s");
      throw err;
    }

    return fullReply;
  }
}
