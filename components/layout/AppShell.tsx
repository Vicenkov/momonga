"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { ChatHeader } from "@/components/layout/ChatHeader";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { SettingsDialog } from "@/components/sidebar/SettingsDialog";
import { SidebarContent } from "@/components/sidebar/SidebarContent";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassModal } from "@/components/ui/GlassModal";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { Conversation } from "@/types/chat";
import { useAppSettings } from "@/hooks/useAppSettings";

const SIDEBAR_WIDTH = 288;
const SIDEBAR_GAP = 16;

type AppShellProps = {
  children: React.ReactNode;
  composer: React.ReactNode;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
};

export function AppShell({
  children,
  composer,
  conversations,
  activeConversation,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
}: AppShellProps) {
  const { settings } = useAppSettings();
  const isVietnamese = settings.language === "vi";
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    setDrawerOpen(false);
  };

  const handleNewChat = () => {
    onNewChat();
    setDrawerOpen(false);
  };

  const handleOpenSettings = () => {
    setDrawerOpen(false);
    setSettingsOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) onDeleteConversation(deleteTargetId);
    setDeleteTargetId(null);
  };

  // Ctrl/Cmd + K: mở sidebar (nếu đang ẩn) rồi nhảy vào ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }
      event.preventDefault();
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setDesktopCollapsed(false);
      } else {
        setDrawerOpen(true);
      }
      setSearchFocusRequest((count) => count + 1);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Chạy sau khi sidebar/drawer đã hiện ra trong trang
  useEffect(() => {
    if (searchFocusRequest === 0) return;
    const inputs = document.querySelectorAll<HTMLInputElement>(
      "[data-sidebar-search]",
    );
    const visibleInput = Array.from(inputs).find(
      (input) => input.getClientRects().length > 0,
    );
    visibleInput?.focus({ preventScroll: true });
    visibleInput?.select();
  }, [searchFocusRequest]);

  const sidebarProps = {
    conversations,
    activeId: activeConversation?.id ?? null,
    onNewChat: handleNewChat,
    onSelect: handleSelect,
    onRename: onRenameConversation,
    onRequestDelete: setDeleteTargetId,
    onOpenSettings: handleOpenSettings,
  };

  return (
    <div className="app-wallpaper relative flex h-dvh overflow-hidden p-0 lg:p-5">
      {/* Khung chat chính: toàn màn hình trên điện thoại */}
      <GlassPanel className="chat-pattern liquid-glass flex min-w-0 flex-1 flex-col overflow-hidden rounded-none shadow-2xl lg:rounded-3xl">
        <ChatHeader
          title={activeConversation?.title ?? "New chat"}
          sidebarCollapsed={desktopCollapsed}
          onToggleSidebar={() => setDesktopCollapsed((collapsed) => !collapsed)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        <div className="min-h-0 flex-1">{children}</div>

        <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
          {composer}
        </div>
      </GlassPanel>

      {/* Sidebar cho màn hình lớn */}
      <motion.aside
        initial={false}
        animate={{
          width: desktopCollapsed ? 0 : SIDEBAR_WIDTH,
          marginLeft: desktopCollapsed ? 0 : SIDEBAR_GAP,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        inert={desktopCollapsed}
        className="hidden shrink-0 overflow-hidden lg:block"
      >
        <GlassPanel className="liquid-glass h-full w-full min-w-0 overflow-hidden rounded-none shadow-2xl lg:rounded-3xl">
          <SidebarContent {...sidebarProps} />
        </GlassPanel>
      </motion.aside>

      {/* Sidebar cho điện thoại và tablet */}
      <MobileDrawer open={drawerOpen} onClose={closeDrawer}>
        <SidebarContent
          {...sidebarProps}
          headerAction={
            <GlassButton
              variant="ghost"
              aria-label="Close sidebar"
              onClick={closeDrawer}
              className="h-9 w-9 px-0"
            >
              <X size={18} />
            </GlassButton>
          }
        />
      </MobileDrawer>

      {/* Hộp thoại xác nhận xóa: đặt ở đây, ngoài các khung kính (xem lưu ý dưới) */}
      <GlassModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title={isVietnamese ? "Xóa cuộc trò chuyện?" : "Delete conversation?"}
      >
        <p className="text-sm text-fg-muted">
          {isVietnamese
            ? "Cuộc trò chuyện sẽ bị xóa vĩnh viễn. Bạn không thể hoàn tác thao tác này."
            : "This conversation will be permanently deleted. This cannot be undone."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <GlassButton onClick={() => setDeleteTargetId(null)}>
            {isVietnamese ? "Hủy" : "Cancel"}
          </GlassButton>
          <GlassButton variant="danger" onClick={confirmDelete}>
            {isVietnamese ? "Xóa" : "Delete"}
          </GlassButton>
        </div>
      </GlassModal>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}