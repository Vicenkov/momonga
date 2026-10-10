export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type CompletionRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
};

// Mọi nhà cung cấp AI đều phải làm được việc này. Phần còn lại của app chỉ biết interface này.
export interface AIProvider {
  complete(request: CompletionRequest): Promise<string>;
  stream(
    request: CompletionRequest,
  ): Promise<AsyncGenerator<string, void, undefined>>;
}

export type AIErrorCode =
  | "config"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "network"
  | "upstream";

export class AIProviderError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
  }
}