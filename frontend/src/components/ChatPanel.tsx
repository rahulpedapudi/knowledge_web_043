import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChatMessage, getConceptChat } from "@/api/client";

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

  // Load chat history when concept changes
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setMessages([]); // Clear previous messages while loading
        const history = await getConceptChat(documentId, conceptId);
        if (isMounted && history.length > 0) {
          // Map backend history to frontend message format
          setMessages(
            history.map((msg) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    if (conceptId) {
      fetchHistory();
    }

    return () => {
      isMounted = false;
    };
  }, [documentId, conceptId]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.parentElement?.scrollTo({
        top: messagesEndRef.current.parentElement.scrollHeight,
        behavior: "smooth",
      });
    }
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
                  : "bg-white/10 text-white/90 rounded-tl-none border border-white/5"
              }`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0 leading-relaxed text-white/90">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-outside ml-4 mb-2 space-y-1 text-white/90">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-outside ml-4 mb-2 space-y-1 text-white/90">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="pl-1">{children}</li>,
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mb-2 text-white mt-1 border-b border-white/10 pb-1">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-bold mb-2 text-white mt-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-bold mb-1 text-white mt-2">
                        {children}
                      </h3>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-emerald-500 pl-3 py-1 my-2 bg-white/5 rounded-r italic text-white/70">
                        {children}
                      </blockquote>
                    ),
                    code: ({
                      node,
                      inline,
                      className,
                      children,
                      ...props
                    }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline ? (
                        <div className="relative group my-3">
                          <div className="absolute -top-3 right-2 text-[10px] text-white/40 uppercase bg-[#1e1e1e] px-2 rounded-t border border-b-0 border-white/10">
                            {match ? match[1] : "code"}
                          </div>
                          <pre className="bg-[#0d0d0d] border border-white/10 rounded-lg p-3 overflow-x-auto text-xs text-blue-200 font-mono shadow-inner">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      ) : (
                        <code
                          className="bg-white/10 px-1.5 py-0.5 rounded text-blue-200 font-mono text-xs border border-white/5"
                          {...props}>
                          {children}
                        </code>
                      );
                    },
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3 border border-white/10 rounded-lg">
                        <table className="min-w-full divide-y divide-white/10 text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="bg-white/10 px-3 py-2 text-left font-semibold text-white">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 border-t border-white/5 text-white/80">
                        {children}
                      </td>
                    ),
                  }}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
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
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
