"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { GlassButton } from "@/components/ui/GlassButton";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/types/chat";

type MessageBubbleProps = {
  message: Message;
  isStreaming?: boolean;
};

function MessageBubbleBase({ message, isStreaming = false }: MessageBubbleProps) {
  const { copied, copy } = useCopyToClipboard();
  const isUser = message.role === "user";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      aria-label={isUser ? "You" : "Assistant"}
      className={cn("group flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && <AssistantAvatar />}

      <div className={cn("min-w-0", isUser ? "max-w-[85%]" : "flex-1")}>
        {isUser ? (
          // Tin nhắn người dùng hiển thị như chữ thuần, không phân tích Markdown
          <div className="chat-bubble-user rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-accent-fg">
            {message.content}
          </div>
        ) : (
          <div className="chat-bubble-assistant">
            <MarkdownContent content={message.content} isStreaming={isStreaming} />
          </div>
        )}

        {!isStreaming && message.content && (
          <div className={cn("mt-1 flex", isUser && "justify-end")}>
            <GlassButton
              variant="ghost"
              aria-label={copied ? "Message copied" : "Copy message"}
              onClick={() => void copy(message.content)}
              className="reveal-on-hover h-8 w-8 rounded-[10px] px-0"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </GlassButton>
          </div>
        )}
      </div>
    </motion.article>
  );
}

// memo: khi AI đang trả lời, chỉ tin nhắn cuối render lại, các tin cũ thì không.
export const MessageBubble = memo(MessageBubbleBase);