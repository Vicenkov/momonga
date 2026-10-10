import type { Conversation, Message } from "@/types/chat";
import { createId } from "@/lib/utils/id";
import { addActivity } from "@/lib/db/local-settings";

const STORAGE_KEY = "chatbot.conversations.v1";
const MAX_TITLE_LENGTH = 80;
const EMPTY: Conversation[] = [];

const listeners = new Set<() => void>();
let cache: Conversation[] | null = null;

function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.conversationId === "string" &&
    (item.role === "user" || item.role === "assistant") &&
    typeof item.content === "string" &&
    typeof item.createdAt === "number"
  );
}

function isConversation(value: unknown): value is Omit<Conversation, "messages"> & { messages?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.updatedAt === "number" &&
    (item.messages === undefined || (Array.isArray(item.messages) && item.messages.every(isMessage)))
  );
}

function sortByRecent(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

function readFromStorage(): Conversation[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? sortByRecent(
          parsed.filter(isConversation).map((item) => ({
            ...item,
            messages: Array.isArray(item.messages) ? item.messages : [],
          })),
        )
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: Conversation[]) {
  cache = sortByRecent(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Bộ nhớ đầy hoặc bị chặn: app vẫn chạy trong phiên này, chỉ không lưu được.
  }
  listeners.forEach((listener) => listener());
}

// ---- Phần dành cho React (useSyncExternalStore) ----

export function subscribe(listener: () => void) {
  listeners.add(listener);

  // Đồng bộ khi bạn sửa dữ liệu ở một tab khác
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getSnapshot(): Conversation[] {
  cache ??= readFromStorage();
  return cache;
}

export function getServerSnapshot(): Conversation[] {
  return EMPTY;
}

// ---- Thao tác ----

export function createConversation(): Conversation {
  const now = Date.now();
  const conversation: Conversation = {
    id: createId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  commit([conversation, ...getSnapshot()]);
  addActivity("created", conversation.title);
  return conversation;
}

export function getConversationMessages(id: string): Message[] {
  return getSnapshot().find((item) => item.id === id)?.messages ?? [];
}

export function saveConversationMessages(id: string, messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  commit(
    getSnapshot().map((item) =>
      item.id === id
        ? {
            ...item,
            messages,
            title:
              item.title === "New chat" && firstUserMessage
                ? firstUserMessage.content.trim().slice(0, MAX_TITLE_LENGTH) || item.title
                : item.title,
            updatedAt: Date.now(),
          }
        : item,
    ),
  );
}

export function renameConversation(id: string, title: string) {
  const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH);
  if (!trimmed) return; // tiêu đề rỗng thì giữ nguyên tên cũ
  commit(
    getSnapshot().map((item) =>
      item.id === id ? { ...item, title: trimmed } : item,
    ),
  );
  addActivity("renamed", trimmed);
}

export function deleteConversation(id: string) {
  const conversation = getSnapshot().find((item) => item.id === id);
  commit(getSnapshot().filter((item) => item.id !== id));
  if (conversation) addActivity("deleted", conversation.title);
}

export function clearConversations() {
  commit([]);
}

export function deleteConversations(ids: string[]) {
  if (ids.length === 0) return;
  const selectedIds = new Set(ids);
  commit(getSnapshot().filter((conversation) => !selectedIds.has(conversation.id)));
}