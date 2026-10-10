"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { cn } from "@/lib/utils/cn";
import type { Conversation } from "@/types/chat";
import { useAppSettings } from "@/hooks/useAppSettings";

type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRequestDelete: (id: string) => void;
};

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onRequestDelete,
}: ConversationItemProps) {
  const { settings } = useAppSettings();
  const isVietnamese = settings.language === "vi";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Ref để Enter/Escape và sự kiện blur không xử lý hai lần
  const isEditingRef = useRef(false);

  const startEditing = () => {
    setDraft(conversation.title);
    isEditingRef.current = true;
    setIsEditing(true);
  };

  const finishEditing = (save: boolean) => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    setIsEditing(false);
    if (save) onRename(conversation.id, draft);
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative min-w-0 w-full"
    >
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          maxLength={80}
          aria-label={isVietnamese ? "Tên cuộc trò chuyện" : "Conversation title"}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={() => finishEditing(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              finishEditing(true);
            }
            if (event.key === "Escape") {
              event.stopPropagation(); // không đóng drawer cùng lúc
              finishEditing(false);
            }
          }}
          className="h-10 w-full min-w-0 rounded-[14px] bg-[var(--glass-highlight)] px-3 text-sm text-fg ring-2 ring-accent outline-none"
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "flex h-10 w-full min-w-0 items-center overflow-hidden rounded-[14px] px-3 pr-[76px] text-left text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              isActive
                ? "bg-[var(--glass-highlight)] font-medium text-fg"
                : "text-fg-muted hover:bg-[var(--glass-bg)] hover:text-fg",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
          </button>

          <div className="reveal-on-hover absolute inset-y-0 right-1 flex items-center">
            <GlassButton
              variant="ghost"
              aria-label={isVietnamese ? `Đổi tên ${conversation.title}` : `Rename ${conversation.title}`}
              onClick={startEditing}
              className="h-9 w-9 rounded-[10px] px-0"
            >
              <Pencil size={15} />
            </GlassButton>
            <GlassButton
              variant="ghost"
              aria-label={isVietnamese ? `Xóa ${conversation.title}` : `Delete ${conversation.title}`}
              onClick={() => onRequestDelete(conversation.id)}
              className="h-9 w-9 rounded-[10px] px-0"
            >
              <Trash2 size={15} />
            </GlassButton>
          </div>
        </>
      )}
    </motion.li>
  );
}