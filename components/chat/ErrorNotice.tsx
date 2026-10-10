"use client";

import { motion } from "motion/react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAppSettings } from "@/hooks/useAppSettings";

type ErrorNoticeProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  const { settings } = useAppSettings();
  const isVietnamese = settings.language === "vi";
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="glass flex items-center gap-3 rounded-[20px] p-3 pl-4 text-sm"
    >
      <AlertCircle size={18} className="shrink-0 text-red-500" />
      <p className="min-w-0 flex-1">{message}</p>
      <GlassButton
      aria-label={isVietnamese ? "Thử lại" : "Retry"}
        onClick={onRetry}
        className="h-9 shrink-0 rounded-[12px] px-3 text-xs"
      >
        <RotateCcw size={14} />
        {isVietnamese ? "Thử lại" : "Retry"}
      </GlassButton>
    </motion.div>
  );
}