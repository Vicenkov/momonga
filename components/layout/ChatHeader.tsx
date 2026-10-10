import Image from "next/image";
import { Menu, PanelRightClose, PanelRightOpen } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAppSettings } from "@/hooks/useAppSettings";

type ChatHeaderProps = {
  title: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenDrawer: () => void;
};

export function ChatHeader({
  title,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenDrawer,
}: ChatHeaderProps) {
  const { settings } = useAppSettings();
  const isVietnamese = settings.language === "vi";
  return (
    <header className="border-b border-[var(--glass-border)] pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
        <div className="glass inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs text-fg-muted">
          <Image
            src="/momonga-coffee.jpg"
            alt=""
            width={20}
            height={20}
            sizes="20px"
            className="h-5 w-5 rounded-full object-contain"
          />
          Momonga cuti
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <h1 className="min-w-0 truncate text-right text-sm font-medium">
            {title === "New chat" && isVietnamese ? "Cuộc trò chuyện mới" : title}
          </h1>

          <GlassButton
            variant="ghost"
            aria-label={sidebarCollapsed
              ? isVietnamese ? "Hiện thanh bên" : "Show sidebar"
              : isVietnamese ? "Ẩn thanh bên" : "Hide sidebar"}
            aria-expanded={!sidebarCollapsed}
            onClick={onToggleSidebar}
            className="hidden h-9 w-9 shrink-0 px-0 lg:inline-flex"
          >
            {sidebarCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </GlassButton>

          <GlassButton
            variant="ghost"
            aria-label={isVietnamese ? "Mở danh sách trò chuyện" : "Open sidebar"}
            onClick={onOpenDrawer}
            className="h-9 w-9 shrink-0 px-0 lg:hidden"
          >
            <Menu size={20} />
          </GlassButton>
        </div>
      </div>
    </header>
  );
}