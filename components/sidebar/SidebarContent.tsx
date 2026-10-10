"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import Image from "next/image";
import { Plus, Search, Settings } from "lucide-react";
import { ConversationItem } from "@/components/sidebar/ConversationItem";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { normalizeForSearch } from "@/lib/utils/text";
import type { Conversation } from "@/types/chat";
import { useAppSettings } from "@/hooks/useAppSettings";

type SidebarContentProps = {
  conversations: Conversation[];
  activeId: string | null;
  headerAction?: React.ReactNode;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRequestDelete: (id: string) => void;
  onOpenSettings: () => void;
};

export function SidebarContent({
  conversations,
  activeId,
  headerAction,
  onNewChat,
  onSelect,
  onRename,
  onRequestDelete,
  onOpenSettings,
}: SidebarContentProps) {
  const { settings } = useAppSettings();
  const isVietnamese = settings.language === "vi";
  const [query, setQuery] = useState("");

  const visibleConversations = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    if (!needle) return conversations;
    return conversations.filter((item) =>
      normalizeForSearch(item.title).includes(needle),
    );
  }, [conversations, query]);

  const hasQuery = query.trim() !== "";

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 overflow-x-hidden p-4">
      <div className="flex min-w-0 items-center justify-between gap-2 pl-2">
        <div className="flex min-w-0 items-center gap-2 text-lg font-semibold tracking-tight">
          <Image
            src="/momonga-coffee.jpg"
            alt=""
            width={24}
            height={24}
            sizes="24px"
            className="h-6 w-6 shrink-0 rounded-full object-contain"
          />
          <span className="truncate">Momonga cuti</span>
        </div>
        {headerAction}
      </div>

      <GlassButton
        variant="accent"
        className="w-full min-w-0 overflow-hidden"
        onClick={onNewChat}
      >
        <Plus size={18} className="shrink-0" />
        <span className="min-w-0 truncate">
          {isVietnamese ? "Cuộc trò chuyện mới" : "New chat"}
        </span>
      </GlassButton>

      <div className="relative min-w-0">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-muted"
        />
        <GlassInput
          data-sidebar-search
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.stopPropagation();
              setQuery("");
            }
          }}
          placeholder={isVietnamese ? "Tìm cuộc trò chuyện" : "Search chats"}
          aria-label={isVietnamese ? "Tìm cuộc trò chuyện" : "Search conversations"}
          className="h-11 min-w-0 max-w-full rounded-xl pl-10 pr-3"
        />
      </div>

      <nav
        aria-label={isVietnamese ? "Các cuộc trò chuyện" : "Conversations"}
        className="-mx-1 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-1"
      >
        {visibleConversations.length === 0 ? (
          <p className="min-w-0 break-words px-2 text-sm text-fg-muted">
            {hasQuery
              ? isVietnamese ? "Không tìm thấy cuộc trò chuyện." : "No matching conversations."
              : isVietnamese ? "Chưa có cuộc trò chuyện." : "No conversations yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {visibleConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === activeId}
                  onSelect={onSelect}
                  onRename={onRename}
                  onRequestDelete={onRequestDelete}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </nav>

      <GlassButton
        variant="ghost"
        className="w-full min-w-0 justify-start overflow-hidden"
        onClick={onOpenSettings}
        aria-label={isVietnamese ? "Mở cài đặt" : "Open settings"}
      >
        <Settings size={18} />
        <span className="min-w-0 truncate">{isVietnamese ? "Cài đặt" : "Settings"}</span>
      </GlassButton>
    </div>
  );
}