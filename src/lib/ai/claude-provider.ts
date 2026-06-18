import { AIProvider, AIMessage } from "./types";

export class ClaudeProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "claude-3-5-sonnet-20241022") {
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
      ...params.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: params.message },
    ];

    const claudeTools = params.tools?.map((t) => {
      if (t.type === "function") return { name: t.function.name, description: t.function.description, input_schema: t.function.parameters };
      return t;
    });

    const body: any = { model: this.model, system: params.systemPrompt, messages, max_tokens: 1500 };
    if (claudeTools && claudeTools.length > 0) body.tools = claudeTools;
    if (stream) body.stream = true;
    return body;
  }

  async sendMessage(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
  }) {
    const apiEndpoint = "https://api.anthropic.com/v1/messages";
    const body = this.buildBody(params, false);

    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[ClaudeProvider] API Error:", res.status, errorText);
      throw new Error(`Claude API Error (${res.status}): ${errorText || res.statusText}`);
    }

    const json = await res.json();
    const contents: any[] = json?.content ?? [];
    const textBlock = contents.find((c) => c.type === "text");
    const reply = textBlock?.text ?? "";
    const toolUseBlocks = contents.filter((c) => c.type === "tool_use");
    const toolCalls = toolUseBlocks.map((t) => ({
      id: t.id,
      type: "function",
      function: { name: t.name, arguments: JSON.stringify(t.input) },
    }));

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
    const apiEndpoint = "https://api.anthropic.com/v1/messages";
    const body = this.buildBody(params, true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let fullReply = "";

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Claude ${res.status}: ${errorText || res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentTextIndex = 0;

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
            if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
              const text = json.delta.text ?? "";
              fullReply += text;
              params.onChunk(text);
            }
            if (json.type === "message_start") {
              currentTextIndex = json.message?.content?.length ?? 0;
            }
          } catch {
            /* skip malformed chunk */
          }
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") throw new Error("Claude streaming timeout após 30s");
      throw err;
    }

    return fullReply;
  }
}
