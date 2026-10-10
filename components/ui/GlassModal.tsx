"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { cn } from "@/lib/utils/cn";

type GlassModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleAdornment?: React.ReactNode;
  panelClassName?: string;
  children: React.ReactNode;
};

export function GlassModal({
  open,
  onClose,
  title,
  titleAdornment,
  panelClassName,
  children,
}: GlassModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
              "liquid-glass relative w-full max-w-md rounded-[2rem] bg-white/70 p-5 shadow-2xl backdrop-blur-2xl outline-none dark:bg-slate-900/70 sm:p-6",
              panelClassName,
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5">
                {titleAdornment}
                <h2 id={titleId} className="truncate text-lg font-semibold">
                  {title}
                </h2>
              </div>
              <GlassButton
                variant="ghost"
                aria-label="Close dialog"
                onClick={onClose}
                className="h-9 w-9 shrink-0 rounded-full border border-white/40 bg-white/35 p-0 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5"
              >
                <X size={18} />
              </GlassButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}