import {
  MessageSquare,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getChatHistory, deleteChat } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createPortal } from "react-dom";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
}

function DeleteConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-xl p-6 w-[320px] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-white mb-2">Delete Chat</h3>
        <p className="text-sm text-slate-400 mb-6">
          Are you sure you want to delete{" "}
          <span className="text-white font-medium">"{title}"</span>? This action
          cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-lg shadow-red-500/20">
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface ChatSession {
  id: string;
  title: string;
  document_id: string;
  created_at: string;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingChat, setDeletingChat] = useState<ChatSession | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Get initials from user name or email
  const getInitials = () => {
    if (!user) return "??";
    if (user.name) {
      const parts = user.name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const confirmDelete = async () => {
    if (!deletingChat) return;

    try {
      await deleteChat(deletingChat.id);
      setChats((prev) => prev.filter((c) => c.id !== deletingChat.id));
      // If we're currently on this chat, go home
      if (window.location.pathname === `/c/${deletingChat.id}`) {
        navigate("/");
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    } finally {
      setDeletingChat(null);
    }
  };

  const promptDelete = (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    setDeletingChat(chat);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await getChatHistory();
      setChats(history);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Collapsed state - just show icons
  if (isCollapsed) {
    return (
      <div className="w-[60px] shrink-0 h-full bg-[#13131f]/40 backdrop-blur-xl border-r border-white/5 flex flex-col shadow-2xl transition-all duration-300">
        {/* Expand Button */}
        <div className="p-2">
          <button
            onClick={onToggle}
            className="w-full p-2 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat */}
        <div className="p-2">
          <button
            onClick={() => navigate("/")}
            className="w-full p-2 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors"
            title="New Chat">
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="p-2">
          <button
            className="w-full p-2 flex items-center justify-center text-white/70 hover:bg-white/10 rounded-lg transition-colors"
            title="Search">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User */}
        <div className="p-2 border-t border-white/10 space-y-1">
          <button
            className="w-full p-2 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
            title={user?.name || user?.email || "User"}>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium text-white">
              {getInitials()}
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full p-2 flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="w-[260px] shrink-0 h-full bg-[#13131f]/40 backdrop-blur-xl border-r border-white/5 flex flex-col shadow-2xl transition-all duration-300">
      {/* Header with Branding & Collapse */}
      <div className="p-4 flex items-center justify-between mb-2">
        <div
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all">
            <div className="w-3 h-3 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white/90">
            Synapse
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Collapse sidebar">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mb-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer border border-white/10 hover:border-white/20">
          <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
            <Plus className="w-3 h-3" />
          </div>
          <span className="font-medium">New chat</span>
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {/* Main Nav */}
        <div className="space-y-1">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left">
            <Search className="w-4 h-4" />
            <span>Search chats</span>
          </button>
        </div>

        {/* History */}
        <div className="space-y-1">
          <div className="px-3 text-xs font-medium text-white/50 mb-2">
            Recent Chats
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
            </div>
          ) : chats.length > 0 ? (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => navigate(`/c/${chat.id}`)}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left truncate group relative">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                <span className="truncate flex-1 pr-6">
                  {chat.title || "Untitled Chat"}
                </span>
                <div
                  onClick={(e) => promptDelete(e, chat)}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                  title="Delete chat">
                  <Trash2 className="w-3 h-3" />
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 text-sm text-white/30 italic">
              No recent chats
            </div>
          )}
        </div>
      </div>

      {/* User / Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium shrink-0">
            {getInitials()}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="truncate font-medium">{user?.name || "User"}</div>
            <div className="truncate text-xs text-white/50">
              {user?.email || ""}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
            title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={!!deletingChat}
        title={deletingChat?.title || "Untitled Chat"}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingChat(null)}
      />
    </div>
  );
}
