import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import type { StreamEvent } from "@/lib/ai/stream-events";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { AIProviderError, type AIErrorCode } from "@/lib/ai/types";
import { validateChatRequest } from "@/lib/ai/validate-chat-request";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 100_000;

// Thông báo thân thiện cho người dùng. Không bao giờ chứa chi tiết kỹ thuật.
const AI_ERRORS: Record<AIErrorCode, { status: number; message: string }> = {
  config: { status: 500, message: "The AI service is not configured yet." },
  auth: { status: 502, message: "The AI service is unavailable. Please try again later." },
  rate_limit: { status: 429, message: "The AI service is busy right now. Please try again shortly." },
  timeout: { status: 504, message: "The AI took too long to respond. Please try again." },
  network: { status: 502, message: "Could not reach the AI service. Please try again." },
  upstream: { status: 502, message: "The AI service returned an error. Please try again." },
};

function describeError(error: unknown) {
  if (error instanceof AIProviderError) {
    const mapped = AI_ERRORS[error.code];
    return { status: mapped.status, code: error.code, message: mapped.message };
  }
  console.error("[api/chat] unexpected error", error);
  return {
    status: 500,
    code: "internal",
    message: "Something went wrong. Please try again.",
  };
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

const encoder = new TextEncoder();

function encodeEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

async function readLimitedBody(
  request: Request,
): Promise<{ body: string } | { tooLarge: true }> {
  const reader = request.body?.getReader();
  if (!reader) return { body: "" };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { body: new TextDecoder().decode(bytes) };
}

export async function POST(request: Request) {
  // Từ chối sớm nếu body khai báo quá lớn.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, "invalid_request", "Your message is too long.");
  }

  let bodyResult: Awaited<ReturnType<typeof readLimitedBody>>;
  try {
    bodyResult = await readLimitedBody(request);
  } catch {
    return errorResponse(400, "invalid_request", "Request body could not be read.");
  }
  if ("tooLarge" in bodyResult) {
    return errorResponse(413, "invalid_request", "Your message is too long.");
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyResult.body);
  } catch {
    return errorResponse(400, "invalid_request", "Request body must be valid JSON.");
  }

  const validation = validateChatRequest(body);
  if (!validation.ok) {
    return errorResponse(400, "invalid_request", validation.message);
  }

  try {
    // Lỗi trước khi có chữ nào (key sai, hết hạn mức...) bị bắt ở đây và trả về JSON thường
    const generator = await getAIProvider().stream({
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...validation.messages],
      signal: request.signal,
    });

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const result = await generator.next();
          if (result.done) {
            controller.close();
            return;
          }
          controller.enqueue(encodeEvent({ type: "delta", text: result.value }));
        } catch (error) {
          // Lỗi giữa chừng: báo cho giao diện bằng một sự kiện, rồi kết thúc luồng
          const { code, message } = describeError(error);
          try {
            controller.enqueue(encodeEvent({ type: "error", code, message }));
            controller.close();
          } catch {
            // Người dùng đã rời đi, không còn ai nhận
          }
        }
      },
      async cancel() {
        await generator.return(undefined);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const { status, code, message } = describeError(error);
    return errorResponse(status, code, message);
  }
}