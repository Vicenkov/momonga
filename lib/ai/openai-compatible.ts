import {
  AIProviderError,
  type AIProvider,
  type CompletionRequest,
} from "@/lib/ai/types";

const CONNECT_TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MS = 120_000;

type ProviderOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

type ChatCompletionResponse = {
  choices?: { message?: { content?: unknown } }[];
};

type StreamChunk = {
  choices?: { delta?: { content?: unknown } }[];
};

type SseEvent =
  | { kind: "done" }
  | { kind: "text"; text: string }
  | { kind: "skip" };

type Connection = {
  response: Response;
  isTimedOut: () => boolean;
  extendTimeout: (ms: number) => void;
  close: () => void;
};

// Một dòng của luồng SSE có dạng:  data: {"choices":[{"delta":{"content":"Xin"}}]}
function parseSseLine(line: string): SseEvent {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return { kind: "skip" };

  const payload = trimmed.slice(5).trim();
  if (payload === "[DONE]") return { kind: "done" };

  try {
    const chunk = JSON.parse(payload) as StreamChunk;
    const text = chunk.choices?.[0]?.delta?.content;
    return typeof text === "string" && text !== ""
      ? { kind: "text", text }
      : { kind: "skip" };
  } catch {
    return { kind: "skip" };
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  private readonly options: ProviderOptions;

  constructor(options: ProviderOptions) {
    this.options = options;
  }

  // Gửi request và kiểm tra trạng thái. Lỗi xảy ra TRƯỚC khi có chữ nào sẽ được ném ra ở đây.
  private async connect(
    request: CompletionRequest,
    stream: boolean,
  ): Promise<Connection> {
    const configuredModel = request.model ?? this.options.model;
    return this.connectModel(request, stream, configuredModel);
  }

  private async connectModel(
    request: CompletionRequest,
    stream: boolean,
    model: string,
  ): Promise<Connection> {
    const { apiKey, baseUrl } = this.options;

    const controller = new AbortController();
    let timedOut = false;
    const onTimeout = () => {
      timedOut = true;
      controller.abort();
    };
    let timer = setTimeout(onTimeout, CONNECT_TIMEOUT_MS);

    // Người dùng đóng kết nối thì hủy luôn lệnh gọi AI để khỏi tốn tiền
    const onClientAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onClientAbort, { once: true });
    if (request.signal?.aborted) controller.abort();

    const close = () => {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onClientAbort);
      controller.abort();
    };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
          "Client-Api-Key": apiKey,
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          stream,
          ...(request.temperature !== undefined && {
            temperature: request.temperature,
          }),
        }),
        signal: controller.signal,
      });
    } catch {
      close();
      throw timedOut
        ? new AIProviderError("timeout", "The AI request timed out.")
        : new AIProviderError("network", "Could not reach the AI service.");
    }

    if (!response.ok) {
      // Chi tiết lỗi chỉ in ra Terminal của bạn, không bao giờ gửi cho trình duyệt
      const detail = await response.text().catch(() => "");
      close();

      if (
        response.status === 429 ||
        /rate.?limit|quota.{0,24}(exceed|exhaust)|resource_exhausted/i.test(detail)
      ) {
        console.warn(
          `[ai] upstream rate limit for ${model}; status ${response.status}.`,
        );
        throw new AIProviderError(
          "rate_limit",
          "The AI service is temporarily rate limited.",
        );
      }
      console.error("[ai] upstream error", response.status, detail.slice(0, 500));
      if (response.status === 401 || response.status === 403) {
        throw new AIProviderError("auth", "The AI service rejected the API key.");
      }
      throw new AIProviderError("upstream", `The AI service returned ${response.status}.`);
    }

    return {
      response,
      isTimedOut: () => timedOut,
      extendTimeout: (ms) => {
        clearTimeout(timer);
        timer = setTimeout(onTimeout, ms);
      },
      close,
    };
  }

  async complete(request: CompletionRequest): Promise<string> {
    const connection = await this.connect(request, false);

    try {
      let data: ChatCompletionResponse;
      try {
        data = (await connection.response.json()) as ChatCompletionResponse;
      } catch {
        throw connection.isTimedOut()
          ? new AIProviderError("timeout", "The AI request timed out.")
          : new AIProviderError("upstream", "The AI service returned invalid JSON.");
      }

      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new AIProviderError("upstream", "The AI service returned an empty answer.");
      }
      return content;
    } finally {
      connection.close();
    }
  }

  async stream(
    request: CompletionRequest,
  ): Promise<AsyncGenerator<string, void, undefined>> {
    const connection = await this.connect(request, true);
    connection.extendTimeout(STREAM_TIMEOUT_MS);

    const body = connection.response.body;
    if (!body) {
      connection.close();
      throw new AIProviderError("upstream", "The AI service sent no data.");
    }
    return this.readStream(body, connection);
  }

  private async *readStream(
    body: ReadableStream<Uint8Array>,
    connection: Connection,
  ): AsyncGenerator<string, void, undefined> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let produced = false;
    let finished = false;

    try {
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseSseLine(line);
          if (event.kind === "done") {
            finished = true;
            break;
          }
          if (event.kind === "text") {
            produced = true;
            yield event.text;
          }
        }
      }
    } catch {
      throw connection.isTimedOut()
        ? new AIProviderError("timeout", "The AI request timed out.")
        : new AIProviderError("network", "The connection to the AI service was interrupted.");
    } finally {
      // Chạy cả khi người dùng bấm Stop: đóng kết nối tới AI ngay
      connection.close();
      reader.cancel().catch(() => undefined);
    }

    if (!produced) {
      throw new AIProviderError("upstream", "The AI service returned an empty answer.");
    }
  }
}