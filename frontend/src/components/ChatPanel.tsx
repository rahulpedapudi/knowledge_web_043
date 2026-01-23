import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import { sendChatMessage } from "@/api/client";

interface ChatPanelProps {
  documentId: string;
  conceptId: string;
  conceptLabel: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({
  documentId,
  conceptId,
  conceptLabel,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear chat when concept changes
  useEffect(() => {
    setMessages([]);
  }, [conceptId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message immediately
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        documentId,
        conceptId,
        userMessage,
        messages.map((m) => ({ role: m.role, content: m.content })),
      );

      setMessages([
        ...newMessages,
        { role: "assistant", content: response.response },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          Chat about:{" "}
          <span className="text-white font-semibold">{conceptLabel}</span>
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8 px-4">
            <p className="mb-2">
              Ask questions about <strong>{conceptLabel}</strong>.
            </p>
            <p className="text-xs">
              I'll use relevant text from the document to answer.
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-blue-600" : "bg-emerald-600"
              }`}>
              {msg.role === "user" ? (
                <UserIcon className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-slate-700 text-slate-200 rounded-tl-none"
              }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
