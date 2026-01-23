import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  Loader2,
  Mic,
  Headphones,
  Plus,
  ArrowUp,
  FileText,
  Sparkles,
  Command
} from "lucide-react";
import { uploadPdf, pasteText } from "@/api/client";
import type { DocumentUploadResponse } from "@/types";

interface DocumentUploadProps {
  onDocumentProcessed: (response: DocumentUploadResponse) => void;
}

export function DocumentUpload({ onDocumentProcessed }: DocumentUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parallax handled by App.tsx, but we can verify if we need internal state or not.
  // The user reported "plane and boring", which implies the previous edit FAILED.
  // So we will stick to the simplified "Transparent" version that relies on App.tsx background.

  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;

    if (inputText.length < 10) {
      setError("Please enter more text to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await pasteText(inputText);
      onDocumentProcessed(response);
    } catch (err) {
      setError("Failed to process text. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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

    setIsLoading(true);
    setError(null);

    try {
      const response = await uploadPdf(file);
      onDocumentProcessed(response);
    } catch (err) {
      setError("Failed to process PDF. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto">
      {/* Top Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 shrink-0">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all">
            <div className="w-3 h-3 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white/90">Synapse 5.2</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
            <span className="text-sm font-medium text-white/60">K</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">

        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 mb-6 backdrop-blur-md">
            <Sparkles className="w-3 h-3" />
            <span>AI-Powered Learning Engine</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 pb-2">
            What are we learning today?
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
            Drop your study materials instantly or ask anything to get started with your personalized graph.
          </p>
        </div>

        {/* Upload Card */}
        <div className="w-full max-w-2xl mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div
            className={`relative group rounded-3xl p-[1px] bg-gradient-to-br from-white/10 to-transparent transition-all duration-300 ${dragOver ? 'scale-[1.02] from-purple-500/50 to-blue-500/50' : ''}`}
          >
            <div className={`relative bg-[#0a0a0f]/40 backdrop-blur-xl rounded-3xl p-10 border border-white/5 overflow-hidden transition-all duration-300 group-hover:bg-[#13131f]/40 ${dragOver ? 'bg-[#13131f]/60' : ''}`}>

              {/* Hover Gradient Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="relative z-10 flex flex-col items-center justify-center text-center cursor-pointer"
              >
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    {isLoading ? (
                      <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-white/70 group-hover:text-white transition-colors" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white/90 mb-2">Upload PDF Document</h3>
                  <p className="text-sm text-slate-500 mb-6">Drag and drop your file here, or click to browse</p>

                  <span className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-200 transition-colors shadow-lg shadow-white/5">
                    Select File
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
            </div>
          </div>
        </div>

        {/* Floating Input Bar */}
        <div className="w-full max-w-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className={`
              relative flex items-end gap-2 p-2 rounded-[32px] 
              bg-white/5 backdrop-blur-2xl border transition-all duration-300
              ${inputText ? 'border-purple-500/30 bg-white/10 shadow-[0_0_40px_rgba(168,85,247,0.15)]' : 'border-white/10 hover:border-white/20'}
           `}>
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
              style={{ scrollbarWidth: 'none' }}
            />

            <div className="flex gap-2 pb-1 shrink-0">
              {inputText ? (
                <button
                  onClick={handleInputSubmit}
                  disabled={isLoading}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-all shadow-lg active:scale-90"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                </button>
              ) : (
                <>
                  <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                    <Headphones className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="text-center mt-6 flex items-center justify-center gap-6 text-xs font-medium text-slate-500/60 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Command className="w-3 h-3" /> Focus Mode</span>
            <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> PDF Support</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> AI Analysis</span>
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
