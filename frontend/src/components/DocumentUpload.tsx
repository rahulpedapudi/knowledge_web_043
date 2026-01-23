import { useState, useCallback } from "react";

import { Upload, Loader2, Mic, Headphones, Plus, ArrowUp } from "lucide-react";
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

  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;

    // If text is short (like a greeting), maybe we just clear it?
    // But since this is the "Upload/Analyze" screen, any text input here implies "Analyze this text".
    // Let's treat it as pasteText content.

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
    <div className="flex-1 flex flex-col h-full bg-[#212121]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-2 text-lg font-semibold text-white/90 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
          <span>GENZPULSE 5.2</span>
          <span className="text-white/50 text-xs">▼</span>
        </button>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full relative">
        {/* Greeting */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-black rounded-full" />
            </div>
          </div>
          <h1 className="text-3xl font-medium text-white mb-2">
            What's on the agenda today?
          </h1>
        </div>

        {/* Upload Component (Simplified to just Upload PDF area) */}
        <div className="w-full mb-6 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Collapsible-ish, simplified look */}
          <div className="bg-[#2f2f2f] rounded-2xl p-4 shadow-lg border border-white/5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl h-24 flex items-center justify-center transition-all cursor-pointer ${
                dragOver
                  ? "border-white/40 bg-white/5"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              }`}>
              <label className="flex items-center justify-center w-full h-full cursor-pointer gap-3">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-white/50" />
                )}
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-white/80">
                    Upload PDF
                  </span>
                  <span className="text-xs text-white/40">
                    Drag & drop or Click
                  </span>
                </div>
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

        {/* Input Bar (Functional now) */}
        <div className="w-full relative">
          <div
            className={`w-full bg-[#2f2f2f] rounded-[26px] flex items-end p-3 pr-4 shadow-lg border transition-colors ${inputText ? "border-white/20" : "border-white/5"}`}>
            <button className="w-8 h-8 rounded-full bg-[#212121] flex items-center justify-center text-white/70 hover:text-white mr-3 shrink-0 mb-1">
              <Plus className="w-5 h-5" />
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste content or ask something..."
              className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder-white/50 resize-none max-h-32 py-2"
              rows={1}
              style={{ minHeight: "24px" }}
            />
            {/* Right Icons */}
            <div className="flex items-center gap-3 ml-3 mb-1 text-white/70">
              {inputText ? (
                <button
                  onClick={handleInputSubmit}
                  disabled={isLoading}
                  className="p-1.5 bg-white text-black rounded-lg hover:bg-white/90 transition-colors">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <>
                  <Mic className="w-5 h-5 hover:text-white cursor-pointer" />
                  <Headphones className="w-5 h-5 hover:text-white cursor-pointer" />
                </>
              )}
            </div>
          </div>
          <div className="text-center mt-3 text-xs text-white/50">
            GENZPULSE can make mistakes. Check important info.
          </div>
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
