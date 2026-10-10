"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { ErrorNotice } from "@/components/chat/ErrorNotice";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { GlassButton } from "@/components/ui/GlassButton";
import type { ChatStatus, Message } from "@/types/chat";

// Cách đáy dưới mức này thì coi như "đang ở đáy"
const NEAR_BOTTOM_PX = 80;

type MessageListProps = {
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  onRetry: () => void;
};

export function MessageList({ messages, status, error, onRetry }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followBottomRef = useRef(true);
  const lastUserMessageIdRef = useRef<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const isNearBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    followBottomRef.current = isNearBottom;
    setShowScrollButton(!isNearBottom);
  };

  // Mỗi khi có tin mới hoặc chữ dài thêm: nếu đang ở đáy thì bám theo
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    // Bạn vừa gửi tin: luôn kéo xuống đáy, kể cả khi trước đó đang cuộn lên
    if (lastMessage?.role === "user" && lastMessage.id !== lastUserMessageIdRef.current) {
      lastUserMessageIdRef.current = lastMessage.id;
      followBottomRef.current = true;
    }

    if (followBottomRef.current) scrollToBottom("auto");
  }, [messages, status, error, scrollToBottom]);

  const handleScrollButtonClick = () => {
    followBottomRef.current = true;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scrollToBottom(prefersReducedMotion ? "auto" : "smooth");
  };

  const lastMessageId = messages[messages.length - 1]?.id;

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation"
        aria-live="off"
        className="h-full overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={status === "streaming" && message.id === lastMessageId}
            />
          ))}
          {status === "waiting" && <TypingIndicator />}
          {error && <ErrorNotice message={error} onRetry={onRetry} />}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto"
            >
              <GlassButton
                aria-label="Scroll to bottom"
                onClick={handleScrollButtonClick}
                className="h-10 w-10 rounded-full px-0"
              >
                <ArrowDown size={18} />
              </GlassButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}