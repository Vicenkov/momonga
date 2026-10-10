"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Square } from "lucide-react";
import Image from "next/image";
import { GlassButton } from "@/components/ui/GlassButton";
import { cn } from "@/lib/utils/cn";
import { useAppSettings } from "@/hooks/useAppSettings";
import type { ChatStatus } from "@/types/chat";

export type ComposerHandle = {
  focus: () => void;
  setValue: (value: string) => void;
};

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  status: ChatStatus;
  disabled?: boolean;
};

export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  function Composer(
    {
      value,
      onChange,
      onSubmit,
      onStop,
      status,
      disabled = false,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { settings } = useAppSettings();
    const isVietnamese = settings.language === "vi";

    const isBusy = status !== "idle";
    const canSend = value.trim().length > 0 && !isBusy && !disabled;

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          textareaRef.current?.focus();
        },

        setValue(nextValue: string) {
          onChange(nextValue);

          requestAnimationFrame(() => {
            textareaRef.current?.focus();
          });
        },
      }),
      [onChange],
    );

    const resizeTextarea = () => {
      const textarea = textareaRef.current;

      if (!textarea) return;

      textarea.style.height = "auto";

      const nextHeight = Math.min(textarea.scrollHeight, 180);

      textarea.style.height = `${nextHeight}px`;

      textarea.style.overflowY =
        textarea.scrollHeight > 180 ? "auto" : "hidden";
    };

    useEffect(() => {
      resizeTextarea();
    }, [value]);

    const handleKeyDown = (
      event: React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
      if (event.key !== "Enter") return;

      // Shift + Enter = xuống dòng
      if (event.shiftKey) {
        return;
      }

      // Không gửi khi đang dùng IME
      if (event.nativeEvent.isComposing) {
        return;
      }

      event.preventDefault();

      if (canSend) {
        onSubmit();
      }
    };

    const handleChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      onChange(event.target.value);
    };

    return (
      <div className="composer-textarea relative w-full rounded-3xl p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onInput={resizeTextarea}
          disabled={disabled}
          rows={1}
          placeholder={isVietnamese ? "Nhắn tin cho AI..." : "Message AI..."}
          aria-label={isVietnamese ? "Tin nhắn" : "Message"}
          className={cn(
            "block w-full resize-none bg-transparent",
            "min-h-10 px-3 py-2",
            "text-[length:var(--chat-font-size)] leading-6",
            "outline-none",
            "placeholder:text-fg-muted",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />

        <div className="flex items-center justify-end px-1 pb-1">
          {isBusy ? (
            <GlassButton
              type="button"
              variant="ghost"
              aria-label={isVietnamese ? "Dừng tạo câu trả lời" : "Stop generating"}
              onClick={onStop}
              className="h-9 w-9 rounded-full px-0"
            >
              <Square size={15} fill="currentColor" />
            </GlassButton>
          ) : (
            <GlassButton
              type="button"
              variant="ghost"
              aria-label={isVietnamese ? "Gửi tin nhắn" : "Send message"}
              disabled={!canSend}
              onClick={onSubmit}
              className="h-9 w-9 overflow-hidden rounded-full bg-transparent p-0 shadow-none hover:bg-transparent"
            >
              <Image
                src="/momonga-avatar.jpg"
                alt=""
                width={36}
                height={36}
                sizes="36px"
                className="h-full w-full rounded-full object-cover"
              />
            </GlassButton>
          )}
        </div>
      </div>
    );
  },
);