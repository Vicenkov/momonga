"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIMITS } from "@/lib/ai/validate-chat-request";
import type { StreamEvent } from "@/lib/ai/stream-events";
import { addActivity } from "@/lib/db/local-settings";
import {
  getConversationMessages,
  saveConversationMessages,
} from "@/lib/db/local-conversations";
import { createId } from "@/lib/utils/id";
import type { ChatStatus, Message } from "@/types/chat";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const OFFLINE_ERROR =
  "Could not reach the server. Check your connection and try again.";

class ChatRequestError extends Error {}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: unknown } };
    if (typeof data.error?.message === "string") return data.error.message;
  } catch {
    // Không đọc được nội dung lỗi: dùng thông báo chung bên dưới
  }
  return GENERIC_ERROR;
}

export function useChat(conversationId: string | null) {
  const [messageState, setMessageState] = useState<{
    conversationId: string | null;
    messages: Message[];
  }>({ conversationId: null, messages: [] });
  const [statusState, setStatusState] = useState<{
    conversationId: string | null;
    status: ChatStatus;
  }>({ conversationId: null, status: "idle" });
  const [errorState, setErrorState] = useState<{
    conversationId: string | null;
    error: string | null;
  }>({ conversationId: null, error: null });
  const abortRef = useRef<AbortController | null>(null);
  const activeConversationIdRef = useRef(conversationId);
  const messages = useMemo(
    () => conversationId
      ? messageState.conversationId === conversationId
        ? messageState.messages
        : getConversationMessages(conversationId)
      : [],
    [conversationId, messageState],
  );
  const status = statusState.conversationId === conversationId ? statusState.status : "idle";
  const error = errorState.conversationId === conversationId ? errorState.error : null;

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (activeConversationIdRef.current === conversationId) return;
    abortRef.current?.abort();
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => stop, [stop]);

  const run = useCallback(async (history: Message[], targetConversationId: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    activeConversationIdRef.current = targetConversationId;
    setErrorState({ conversationId: targetConversationId, error: null });
    setStatusState({ conversationId: targetConversationId, status: "waiting" });

    const assistantId = createId();
    const assistantCreatedAt = Date.now();
    let text = "";
    let updatedHistory = history;

    const publish = () => {
      const content = text;
      const existingIndex = updatedHistory.findIndex((message) => message.id === assistantId);
      const assistantMessage: Message = {
        id: assistantId,
        conversationId: targetConversationId,
        role: "assistant",
        content,
        createdAt: assistantCreatedAt,
      };
      updatedHistory = existingIndex === -1
        ? [...updatedHistory, assistantMessage]
        : updatedHistory.map((message, index) => index === existingIndex ? assistantMessage : message);
      saveConversationMessages(targetConversationId, updatedHistory);
      setMessageState((previous) => activeConversationIdRef.current === targetConversationId
        ? { conversationId: targetConversationId, messages: updatedHistory }
        : previous);
      setStatusState({ conversationId: targetConversationId, status: "streaming" });
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new ChatRequestError(await readErrorMessage(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let changed = false;
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "error") throw new ChatRequestError(event.message);
          text += event.text;
          changed = true;
        }
        if (changed) publish();
      }
    } catch (caught) {
      // Bấm Stop không phải lỗi: giữ nguyên phần chữ đã nhận
      if (!controller.signal.aborted) {
        setErrorState({
          conversationId: targetConversationId,
          error: caught instanceof ChatRequestError
            ? caught.message
            : caught instanceof TypeError
              ? OFFLINE_ERROR
              : GENERIC_ERROR,
        });
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        if (activeConversationIdRef.current === targetConversationId) {
          setStatusState({ conversationId: targetConversationId, status: "idle" });
        }
      }
    }
  }, []);

  const send = useCallback(
    (input: string, targetConversationId = conversationId) => {
      const content = input.trim();
      if (!content || !targetConversationId || status !== "idle") return;

      if (content.length > LIMITS.maxMessageChars) {
        setErrorState({
          conversationId: targetConversationId,
          error: `Your message is too long (max ${LIMITS.maxMessageChars.toLocaleString("en-US")} characters).`,
        });
        return;
      }

      const userMessage: Message = {
        id: createId(),
        conversationId: targetConversationId,
        role: "user",
        content,
        createdAt: Date.now(),
      };
      const history = [...messages, userMessage];
      setMessageState({ conversationId: targetConversationId, messages: history });
      saveConversationMessages(targetConversationId, history);
      addActivity("message", "Message sent");
      void run(history, targetConversationId);
    },
    [conversationId, messages, status, run],
  );

  // Gửi lại từ tin nhắn cuối của người dùng (bỏ phần trả lời dở dang nếu có)
  const retry = useCallback(() => {
    if (status !== "idle" || !conversationId) return;

    let lastUserIndex = -1;
    for (let index = messages.length - 1; index >= 0; index--) {
      if (messages[index].role === "user") {
        lastUserIndex = index;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const history = messages.slice(0, lastUserIndex + 1);
    setMessageState({ conversationId, messages: history });
    saveConversationMessages(conversationId, history);
    void run(history, conversationId);
  }, [conversationId, messages, status, run]);

  return { messages, status, error, send, stop, retry };
}