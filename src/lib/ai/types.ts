export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIProvider {
  sendMessage(params: {
    systemPrompt: string;
    message: string;
    history: AIMessage[];
    tools?: any[];
  }): Promise<{ reply: string; toolCalls?: any[] }>;
}
