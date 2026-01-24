import { useState, useCallback } from "react";
import {
  Upload,
  Loader2,
  Mic,
  Headphones,
  Plus,
  ArrowUp,
  FileText,
  X,
  Sparkles,
  BookOpen,
  Command,
} from "lucide-react";
import { uploadPdf, pasteText, generateFromTopic } from "@/api/client";
import type { DocumentUploadResponse } from "@/types";

interface DocumentUploadProps {
  onDocumentProcessed: (response: DocumentUploadResponse) => void;
}

type UploadStep = "upload" | "concepts" | "topic-only";

export function DocumentUpload({ onDocumentProcessed }: DocumentUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two-step upload flow
  const [step, setStep] = useState<UploadStep>("upload");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [focusConcepts, setFocusConcepts] = useState("");

  const handleProcess = async (
    file?: File,
    text?: string,
    concepts: string[] = [],
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      let response: DocumentUploadResponse;

      if (step === "topic-only" && concepts.length > 0) {
        response = await generateFromTopic(concepts);
      } else if (file) {
        response = await uploadPdf(file, undefined, concepts);
      } else if (text) {
        response = await pasteText(text, undefined, concepts);
      } else {
        setError("No content to process.");
        setIsLoading(false);
        return;
      }
      onDocumentProcessed(response);
    } catch (err) {
      setError("Failed to process. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;

    if (inputText.length < 10) {
      setError("Please enter more text to analyze.");
      return;
    }

    setPendingText(inputText);
    setInputText("");
    // Skip concept step, proceed directly
    await handleProcess(undefined, inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }

    setPendingFile(file);
    // Skip concept step, proceed directly
    await handleProcess(file);
  };

  const handleTopicOnlyProcess = async () => {
    if (!focusConcepts.trim()) return;

    setIsLoading(true);
    const concepts = focusConcepts
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    await handleProcess(undefined, undefined, concepts);
  };

  const handleTopicOnlyMode = () => {
    setPendingFile(null);
    setPendingText(null);
    setStep("topic-only");
    setError(null);
  };

  const handleBackToUpload = () => {
    setStep("upload");
    setPendingFile(null);
    setPendingText(null);
    setFocusConcepts("");
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  // Step 2: Concepts Input Screen (Only for "Learn Any Topic" mode now)
  if (step === "topic-only") {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#212121]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBackToUpload}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full relative">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex justify-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-linear-to-br from-blue-500 to-cyan-500">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-medium text-white mb-2">
              Learn Any Topic
            </h2>
            <p className="text-white/50 text-sm">
              Enter the topics you want to explore and learn about
            </p>
          </div>

          <div className="w-full mb-6">
            <div className="bg-[#2f2f2f] rounded-2xl p-5 shadow-lg border border-white/5">
              <label className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Topics to Learn
              </label>
              <textarea
                value={focusConcepts}
                onChange={(e) => setFocusConcepts(e.target.value)}
                placeholder="Enter topics you want to learn, separated by commas or new lines.\n\nExample:\nMachine Learning, Neural Networks\nDeep Learning\nBackpropagation"
                className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/40 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                rows={6}
              />
              <p className="text-xs text-white/40 mt-2">
                AI will generate a comprehensive knowledge graph about these
                topics.
              </p>
            </div>
          </div>

          <div className="w-full flex gap-3">
            <button
              onClick={handleBackToUpload}
              className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleTopicOnlyProcess}
              disabled={isLoading || !focusConcepts.trim()}
              className="flex-1 py-3 px-4 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Knowledge Graph
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 1: Upload Screen
  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto">
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 mb-6 backdrop-blur-md">
            <Sparkles className="w-3 h-3" />
            <span>AI-Powered Learning Engine</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 pb-2">
            What are we learning today?
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
            Drop your study materials instantly or ask anything to get started
            with your personalized graph.
          </p>
        </div>

        {/* Upload Card - Combined from both versions */}
        <div className="w-full max-w-2xl mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div
            className={`relative group rounded-3xl p-[1px] bg-gradient-to-br from-white/10 to-transparent transition-all duration-300 ${dragOver ? "scale-[1.02] from-purple-500/50 to-blue-500/50" : ""}`}
          >
            <div
              className={`relative bg-[#0a0a0f]/40 backdrop-blur-xl rounded-3xl p-8 border border-white/5 overflow-hidden transition-all duration-300 group-hover:bg-[#13131f]/40 ${dragOver ? "bg-[#13131f]/60" : ""}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="flex gap-4 relative z-10">
                {/* Upload PDF */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    dragOver
                      ? "border-white/40 bg-white/5"
                      : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <label className="flex flex-col items-center justify-center w-full cursor-pointer gap-3">
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                      <Upload className="w-6 h-6 text-white/60" />
                    </div>
                    <span className="text-sm font-medium text-white/80">
                      Upload PDF
                    </span>
                    <span className="text-xs text-white/40">
                      Drag & drop or Click
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                </div>

                {/* Learn Any Topic */}
                <button
                  onClick={handleTopicOnlyMode}
                  className="flex-1 border-2 border-dashed border-blue-500/30 rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5"
                >
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2">
                    <BookOpen className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-white/80">
                    Learn Any Topic
                  </span>
                  <span className="text-xs text-white/40">
                    No document needed
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Input Bar */}
        <div className="w-full max-w-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div
            className={`
              relative flex items-center gap-2 p-2 rounded-[32px] 
              bg-white/5 backdrop-blur-2xl border transition-all duration-300
              ${inputText ? "border-purple-500/30 bg-white/10 shadow-[0_0_40px_rgba(168,85,247,0.15)]" : "border-white/10 hover:border-white/20"}
           `}
          >
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0">
              <Plus className="w-5 h-5" />
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste text or ask a question..."
              className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-white/30 resize-none py-3 px-2 min-h-[48px] max-h-32"
              rows={1}
              style={{ scrollbarWidth: "none" }}
            />

            <div className="flex gap-2 pb-1 shrink-0">
              {inputText ? (
                <button
                  onClick={handleInputSubmit}
                  disabled={isLoading}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-all shadow-lg active:scale-90"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </button>
              ) : (
                <></>
              )}
            </div>
          </div>

          <div className="text-center mt-6 flex items-center justify-center gap-6 text-xs font-medium text-slate-500/60 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <Command className="w-3 h-3" /> Focus Mode
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> PDF Support
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> AI Analysis
            </span>
          </div>
        </div>

        {error && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-3 rounded-full backdrop-blur-xl shadow-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              {error}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
