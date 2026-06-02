import { AIProvider, AIMessage } from "./types";

export class ClaudeProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "claude-3-5-sonnet-20241022") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
  }) {
    const apiEndpoint = "https://api.anthropic.com/v1/messages";

    // Convert history and current message to Claude message structure
    const messages = [
      ...params.history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: params.message },
    ];

    // Convert OpenAI tools format to Claude tools format
    const claudeTools = params.tools?.map((t) => {
      if (t.type === "function") {
        return {
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        };
      }
      return t;
    });

    const body: any = {
      model: this.model,
      system: params.systemPrompt,
      messages,
      max_tokens: 1500,
    };

    if (claudeTools && claudeTools.length > 0) {
      body.tools = claudeTools;
    }

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
    
    // Extract textual reply
    const textBlock = contents.find((c) => c.type === "text");
    const reply = textBlock?.text ?? "";

    // Extract tool uses and map back to standard OpenAI tool_calls structure
    const toolUseBlocks = contents.filter((c) => c.type === "tool_use");
    const toolCalls = toolUseBlocks.map((t) => ({
      id: t.id,
      type: "function",
      function: {
        name: t.name,
        arguments: JSON.stringify(t.input),
      },
    }));

    return { reply, toolCalls };
  }
}
