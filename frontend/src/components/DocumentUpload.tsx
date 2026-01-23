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

  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;

    if (inputText.length < 10) {
      setError("Please enter more text to analyze.");
      return;
    }

    // Move to concepts step instead of processing immediately
    setPendingText(inputText);
    setPendingFile(null);
    setInputText("");
    setStep("concepts");
    setError(null);
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

    // Move to concepts step instead of processing immediately
    setPendingFile(file);
    setPendingText(null);
    setStep("concepts");
    setError(null);
  };

  const handleProcessWithConcepts = async () => {
    setIsLoading(true);
    setError(null);

    // Parse focus concepts (comma or newline separated)
    const concepts = focusConcepts
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (concepts.length === 0) {
      setError("Please enter at least one concept.");
      setIsLoading(false);
      return;
    }

    try {
      let response: DocumentUploadResponse;

      // Topic-only mode: generate from concepts without a document
      if (step === "topic-only") {
        response = await generateFromTopic(concepts);
      } else if (pendingFile) {
        response = await uploadPdf(pendingFile, undefined, concepts);
      } else if (pendingText) {
        response = await pasteText(pendingText, undefined, concepts);
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

  // Step 2: Concepts Input Screen (for both document + concepts AND topic-only modes)
  if (step === "concepts" || step === "topic-only") {
    const isTopicOnly = step === "topic-only";

    return (
      <div className="flex-1 flex flex-col h-full bg-[#212121]">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBackToUpload}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full relative">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex justify-center">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  isTopicOnly
                    ? "bg-linear-to-br from-blue-500 to-cyan-500"
                    : "bg-linear-to-br from-purple-500 to-pink-500"
                }`}>
                {isTopicOnly ? (
                  <BookOpen className="w-7 h-7 text-white" />
                ) : (
                  <FileText className="w-7 h-7 text-white" />
                )}
              </div>
            </div>
            <h2 className="text-2xl font-medium text-white mb-2">
              {isTopicOnly
                ? "Learn Any Topic"
                : pendingFile?.name || "Your Content"}
            </h2>
            <p className="text-white/50 text-sm">
              {isTopicOnly
                ? "Enter the topics you want to explore and learn about"
                : "What concepts do you want to learn from this document?"}
            </p>
          </div>

          {/* Concepts Input */}
          <div className="w-full mb-6">
            <div className="bg-[#2f2f2f] rounded-2xl p-5 shadow-lg border border-white/5">
              <label className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                {isTopicOnly ? "Topics to Learn" : "Focus Concepts"}
              </label>
              <textarea
                value={focusConcepts}
                onChange={(e) => setFocusConcepts(e.target.value)}
                placeholder={
                  isTopicOnly
                    ? "Enter topics you want to learn, separated by commas or new lines.\n\nExample:\nMachine Learning, Neural Networks\nDeep Learning\nBackpropagation"
                    : "Enter the concepts you want to learn, separated by commas or new lines.\n\nExample:\nPhotosynthesis, Chlorophyll\nLight Reactions\nCalvin Cycle"
                }
                className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/40 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                rows={6}
              />
              <p className="text-xs text-white/40 mt-2">
                {isTopicOnly
                  ? "AI will generate a comprehensive knowledge graph about these topics."
                  : "The knowledge graph will focus on these concepts and their relationships."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex gap-3">
            <button
              onClick={handleBackToUpload}
              className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors">
              Back
            </button>
            <button
              onClick={handleProcessWithConcepts}
              disabled={isLoading || !focusConcepts.trim()}
              className={`flex-1 py-3 px-4 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 ${
                isTopicOnly
                  ? "bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                  : "bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              }`}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isTopicOnly ? "Generating..." : "Processing..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {isTopicOnly
                    ? "Generate Knowledge Graph"
                    : "Build Knowledge Graph"}
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
    <div className="flex-1 flex flex-col h-full bg-[#212121]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-2 text-lg font-semibold text-white/90 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
          <span>Synapse 5.2</span>
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
            <div className="flex gap-3">
              {/* Upload PDF */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-xl h-24 flex items-center justify-center transition-all cursor-pointer ${
                  dragOver
                    ? "border-white/40 bg-white/5"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}>
                <label className="flex items-center justify-center w-full h-full cursor-pointer gap-3">
                  <Upload className="w-6 h-6 text-white/50" />
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

              {/* Learn Any Topic Button */}
              <button
                onClick={handleTopicOnlyMode}
                className="flex-1 border-2 border-dashed border-blue-500/30 rounded-xl h-24 flex items-center justify-center gap-3 transition-all cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5">
                <BookOpen className="w-6 h-6 text-blue-400/70" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-white/80">
                    Learn Any Topic
                  </span>
                  <span className="text-xs text-white/40">
                    No document needed
                  </span>
                </div>
              </button>
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
                  <ArrowUp className="w-4 h-4" />
                </button>
              ) : (
                <></>
              )}
            </div>
          </div>
          <div className="text-center mt-3 text-xs text-white/50">
            Synapse can make mistakes. Check important info.
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
