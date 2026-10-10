import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  createConversation,
  deleteConversation,
  getServerSnapshot,
  getSnapshot,
  renameConversation,
  subscribe,
} from "@/lib/db/local-conversations";

export function useConversations() {
  const conversations = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? conversations[0] ?? null,
    [conversations, activeId],
  );

  const startNewChat = useCallback(() => {
    const conversation = createConversation();
    setActiveId(conversation.id);
    return conversation;
  }, []);

  return {
    conversations,
    activeConversation,
    selectConversation: setActiveId,
    startNewChat,
    renameConversation,
    removeConversation: deleteConversation,
  };
}