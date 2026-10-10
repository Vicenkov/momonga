import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible";
import { AIProviderError, type AIProvider } from "@/lib/ai/types";

export function getAIProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim().replace(/\/+$/, "");
  const model = process.env.AI_MODEL?.trim();

  if (!apiKey || !baseUrl || !model) {
    console.error("[ai] Missing AI_BASE_URL, AI_API_KEY, or AI_MODEL in .env.local");
    throw new AIProviderError("config", "The AI service is not configured.");
  }

  return new OpenAICompatibleProvider({ apiKey, baseUrl, model });
}