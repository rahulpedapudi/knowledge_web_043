import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  MessageSquare,
} from "lucide-react";
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
    if (messagesEndRef.current) {
      messagesEndRef.current.parentElement?.scrollTo({
        top: messagesEndRef.current.parentElement.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Format assistant response with markdown support
  const formatAssistantResponse = (content: string) => {
    const lines = content.split("\n");
    const parts: React.ReactNode[] = [];
    let bulletPoints: string[] = [];
    let inCodeBlock = false;
    let codeContent = "";
    let codeLanguage = "";

    const flushBulletPoints = () => {
      if (bulletPoints.length > 0) {
        parts.push(
          <ul
            key={`bullets-${parts.length}`}
            className="list-disc list-inside mb-2 text-white/90 space-y-1"
          >
            {bulletPoints.map((point, idx) => (
              <li key={idx} className="text-white/90">
                {point}
              </li>
            ))}
          </ul>,
        );
        bulletPoints = [];
      }
    };

    const parseInlineMarkdown = (text: string) => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;

      while ((match = boldRegex.exec(text)) !== null) {
        // Add text before bold
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        // Add bold text
        parts.push(<strong key={`bold-${parts.length}`}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 0 ? parts : text;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle code blocks
      if (line.trim().startsWith("```")) {
        if (!inCodeBlock) {
          flushBulletPoints();
          inCodeBlock = true;
          codeLanguage = line.replace("```", "").trim();
          codeContent = "";
        } else {
          inCodeBlock = false;
          parts.push(
            <pre
              key={`code-${parts.length}`}
              className="bg-black/40 border border-white/10 rounded p-3 mb-3 overflow-x-auto text-xs text-white/80"
            >
              <code>{codeContent}</code>
            </pre>,
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + "\n";
        continue;
      }

      // Handle bullet points
      if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
        const bulletText = line.trim().substring(1).trim();
        bulletPoints.push(bulletText);
        continue;
      }

      // Handle regular text with markdown formatting
      if (line.trim()) {
        flushBulletPoints();
        parts.push(
          <div key={i} className="text-white/90 mb-2 leading-relaxed">
            {parseInlineMarkdown(line)}
          </div>,
        );
      }
    }

    flushBulletPoints();
    return parts.length > 0 ? parts : content;
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          Chat about{" "}
          <span className="text-white font-semibold">{conceptLabel}</span>
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-white/40 text-sm py-8 px-4">
            <p className="mb-2">
              Ask questions about{" "}
              <strong className="text-white/60">{conceptLabel}</strong>.
            </p>
            <p className="text-xs text-white/30">
              I'll use relevant text from the document to answer.
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-blue-600" : "bg-emerald-600"
              }`}
            >
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
                  : "bg-white/10 text-white/90 rounded-tl-none border border-white/5"
              }`}
            >
              {msg.role === "assistant"
                ? formatAssistantResponse(msg.content)
                : msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3 text-white/60 border border-white/5">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
