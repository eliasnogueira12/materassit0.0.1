import { AIProvider, AIMessage } from "./types";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private buildBody(
    params: {
      systemPrompt: string;
      message: string;
      history: AIMessage[];
      tools?: any[];
    },
    stream = false,
  ) {
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
    const apiEndpoint = "https://api.openai.com/v1/chat/completions";
    const body = this.buildBody(params, false);

    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[OpenAIProvider] API Error:", res.status, errorText);
      throw new Error(`OpenAI API Error (${res.status}): ${errorText || res.statusText}`);
    }

    const json = await res.json();
    const choice = json?.choices?.[0];
    const reply = choice?.message?.content ?? "";
    const toolCalls = choice?.message?.tool_calls ?? [];

    return { reply, toolCalls };
  }

  async sendMessageStream(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
    onChunk: (chunk: string) => void;
    onToolCalls?: (calls: any[]) => void;
  }): Promise<string> {
    const apiEndpoint = "https://api.openai.com/v1/chat/completions";
    const body = this.buildBody(params, true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let fullReply = "";

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI ${res.status}: ${errorText || res.statusText}`);
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
      if (err.name === "AbortError") throw new Error("OpenAI streaming timeout após 30s");
      throw err;
    }

    return fullReply;
  }
}
