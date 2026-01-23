import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { generateFlashcards } from "@/api/client";

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardDialogProps {
  conceptId: string;
  documentId: string;
  conceptLabel: string;
  onClose: () => void;
}

export function FlashcardDialog({
  conceptId,
  documentId,
  conceptLabel,
  onClose,
}: FlashcardDialogProps) {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFlashcards = async () => {
      try {
        setLoading(true);
        const data = await generateFlashcards(conceptId, documentId);
        if (data.cards && data.cards.length > 0) {
          setCards(data.cards);
        } else {
          setError("Could not generate flashcards. Please try again.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to generate flashcards");
      } finally {
        setLoading(false);
      }
    };
    loadFlashcards();
  }, [conceptId, documentId]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((i) => i + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((i) => i - 1), 150);
    }
  };

  const handleFlip = () => setIsFlipped((f) => !f);

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Generating Flashcards
          </h3>
          <p className="text-slate-400">
            Creating study cards for {conceptLabel}...
          </p>
        </div>
      </div>,
      document.body,
    );
  }

  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const currentCard = cards[currentIndex];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Flashcards: {conceptLabel}
              </h2>
              <div className="text-sm text-slate-400">
                Card {currentIndex + 1} of {cards.length}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-800 w-full">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Flashcard Area */}
        <div className="flex-1 p-8 flex items-center justify-center min-h-[400px]">
          <div
            onClick={handleFlip}
            className="relative w-full max-w-xl h-72 cursor-pointer perspective-1000"
            style={{ perspective: "1000px" }}>
            <div
              className={`absolute inset-0 transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? "rotate-y-180" : ""
              }`}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}>
              {/* Front */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-2xl p-8 flex items-center justify-center backface-hidden"
                style={{ backfaceVisibility: "hidden" }}>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-4">
                    Question
                  </p>
                  <h3 className="text-2xl font-medium text-white leading-relaxed">
                    {currentCard.front}
                  </h3>
                  <p className="text-sm text-slate-500 mt-6">Click to flip</p>
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-8 flex items-center justify-center backface-hidden rotate-y-180"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-emerald-500 mb-4">
                    Answer
                  </p>
                  <p className="text-xl text-slate-200 leading-relaxed">
                    {currentCard.back}
                  </p>
                  <p className="text-sm text-slate-500 mt-6">
                    Click to flip back
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-slate-700/50 bg-slate-800/20 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentIndex === 0
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-300 hover:bg-slate-700"
            }`}>
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex(0);
            }}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentIndex === cards.length - 1
                ? "text-slate-600 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}>
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
