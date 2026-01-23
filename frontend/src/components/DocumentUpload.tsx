import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Sparkles, Loader2 } from "lucide-react";
import { uploadPdf, pasteText, createDemo } from "@/api/client";
import type { DocumentUploadResponse } from "@/types";

interface DocumentUploadProps {
  onDocumentProcessed: (response: DocumentUploadResponse) => void;
}

export function DocumentUpload({ onDocumentProcessed }: DocumentUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("paste");
  const [textContent, setTextContent] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasteSubmit = async () => {
    if (!textContent.trim() || textContent.length < 20) {
      setError("Please enter at least 20 characters of text");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await pasteText(textContent);
      onDocumentProcessed(response);
    } catch (err) {
      setError("Failed to process text. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
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

  const handleDemoClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createDemo();
      onDocumentProcessed(response);
    } catch (err) {
      setError("Failed to create demo. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            GENZPULSE
          </h1>
          <p className="text-slate-400 text-lg">
            Transform textbook content into interactive causal structures
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("paste")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "paste"
                ? "bg-blue-600 text-white"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
            }`}>
            <FileText className="inline-block w-4 h-4 mr-2" />
            Paste Text
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "upload"
                ? "bg-blue-600 text-white"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
            }`}>
            <Upload className="inline-block w-4 h-4 mr-2" />
            Upload PDF
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          {activeTab === "paste" ? (
            <div className="space-y-4">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your textbook content here...

Example: 'When temperature increases in a closed container, pressure also increases proportionally. This relationship is known as Gay-Lussac's Law.'"
                className="w-full h-64 p-4 bg-slate-900/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <Button
                onClick={handlePasteSubmit}
                disabled={isLoading || !textContent.trim()}
                className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Extract Causal Relationships
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragOver
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-600 hover:border-slate-500"
              }`}>
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                  <p className="text-slate-300">Processing PDF...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">
                    Drag & drop your PDF here
                  </p>
                  <p className="text-slate-500 text-sm mb-4">or</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <span className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors">
                      Browse Files
                    </span>
                  </label>
                </>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Demo Button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleDemoClick}
            disabled={isLoading}
            className="text-slate-400 hover:text-blue-400 transition-colors text-sm underline underline-offset-4">
            or try with demo content →
          </button>
        </div>
      </div>
    </div>
  );
}
