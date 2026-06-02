import { AIProvider, AIMessage } from "./types";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
  }) {
    const apiEndpoint = "https://api.openai.com/v1/chat/completions";

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

    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
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
}
