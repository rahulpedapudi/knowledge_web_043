import { MessageSquare, Search, Plus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getChatHistory } from "@/api/client";
import { useNavigate } from "react-router-dom";

interface ChatSession {
  id: string;
  title: string;
  document_id: string;
  created_at: string;
}

export function Sidebar() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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

  return (
    <div className="w-[260px] shrink-0 h-full bg-[#13131f]/40 backdrop-blur-xl border-r border-white/5 flex flex-col md:flex shadow-2xl">
      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-medium">New chat</span>
          <span className="ml-auto text-white/50">
            <MessageSquare className="w-4 h-4" />
          </span>
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
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left truncate group">
                <span className="truncate flex-1">
                  {chat.title || "Untitled Chat"}
                </span>
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
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium">
            RO
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate font-medium">Rahul</div>
            <div className="truncate text-xs text-white/50">Go</div>
          </div>
        </button>
      </div>
    </div>
  );
}
