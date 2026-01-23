import {
  MessageSquare,
  Search,
  Plus,
} from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-[260px] flex-shrink-0 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col hidden md:flex">
      {/* New Chat Button */}
      <div className="p-3">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
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

        {/* History Mock */}
        <div className="space-y-1">
          <div className="px-3 text-xs font-medium text-white/50 mb-2">
            Your chats
          </div>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left truncate">
            <span>Generative Knowledge Web</span>
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left truncate">
            <span>Intelligent Virtual Waiting...</span>
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left truncate">
            <span>What is ML Model</span>
          </button>
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
