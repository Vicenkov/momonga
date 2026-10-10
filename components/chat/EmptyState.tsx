"use client";

import { motion } from "motion/react";
import {
  FileSearch,
  Lightbulb,
  PenLine,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

type Suggestion = {
  title: string;
  hint: string;
  prompt: string;
  icon: LucideIcon;
};

const SUGGESTIONS: Suggestion[] = [
  {
    title: "Explain something",
    hint: "Break down a topic simply",
    prompt: "Explain how the internet works in simple terms.",
    icon: Lightbulb,
  },
  {
    title: "Write something",
    hint: "Emails, essays, captions",
    prompt: "Write a short, polite email asking my teacher for a deadline extension.",
    icon: PenLine,
  },
  {
    title: "Solve a problem",
    hint: "Work through it step by step",
    prompt: "Help me solve a problem step by step. Here it is: ",
    icon: Puzzle,
  },
  {
    title: "Analyze a file",
    hint: "Summarize or review text",
    prompt: "Summarize the key points of this text: ",
    icon: FileSearch,
  },
];

type EmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
};

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const { settings } = useAppSettings();
  const isVietnamese = settings.language === "vi";
  const suggestions = isVietnamese
    ? [
        { title: "Giải thích một chủ đề", hint: "Diễn giải đơn giản, dễ hiểu", prompt: "Giải thích cách Internet hoạt động bằng ngôn ngữ đơn giản.", icon: Lightbulb },
        { title: "Soạn nội dung", hint: "Email, bài luận, chú thích", prompt: "Viết email lịch sự xin giáo viên gia hạn thời hạn nộp bài.", icon: PenLine },
        { title: "Giải quyết vấn đề", hint: "Phân tích từng bước", prompt: "Giúp tôi giải quyết vấn đề này từng bước: ", icon: Puzzle },
        { title: "Phân tích văn bản", hint: "Tóm tắt hoặc nhận xét nội dung", prompt: "Tóm tắt các ý chính của văn bản sau: ", icon: FileSearch },
      ]
    : SUGGESTIONS;
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="m-auto w-full max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {isVietnamese ? "Hí lô! Momo cuti đây~" : "Hi there! Momo is here~"}
        </h2>
        <p className="mt-2 text-fg-muted">
          {isVietnamese
            ? "Hôm nay cậu muốn tớ giúp gì nào? Khen tớ một câu lấy tinh thần nha~ ✨"
            : "What can I help you with today? A little praise would make my day~ ✨"}
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          {suggestions.map(({ title, hint, prompt, icon: Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + index * 0.05, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={() => onSelectPrompt(prompt)}
                className="glass glass-sheen flex w-full flex-col gap-2 rounded-xl p-4 text-left transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
              >
                <Icon size={20} className="text-accent" />
                <span className="font-medium">{title}</span>
                <span className="text-sm text-fg-muted">{hint}</span>
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}