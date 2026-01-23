import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Trophy, Timer, AlertCircle, CheckCircle2 } from "lucide-react";
import { generateQuiz } from "@/api/client";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface QuizDialogProps {
  conceptId: string;
  documentId: string;
  conceptLabel: string;
  onClose: () => void;
}

export function QuizDialog({
  conceptId,
  documentId,
  conceptLabel,
  onClose,
}: QuizDialogProps) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Generate/Fetch Quiz on Mount
    const loadQuiz = async () => {
      try {
        setLoading(true);
        const data = await generateQuiz(conceptId, documentId);
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        } else {
          setError("Could not generate quiz. Please try again.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to generate quiz");
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [conceptId, documentId]);

  useEffect(() => {
    if (!loading && !isFinished && !isAnswered && questions.length > 0) {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      } else {
        handleTimeout();
      }
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, loading, isFinished, isAnswered, questions]);

  // Shuffle options for current question
  const { shuffledOptions, shuffledCorrectIndex } = useMemo(() => {
    if (questions.length === 0 || currentQuestionIndex >= questions.length) {
      return { shuffledOptions: [], shuffledCorrectIndex: 0 };
    }
    const currentQ = questions[currentQuestionIndex];
    // Create array of indices and shuffle them
    const indices = currentQ.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const shuffled = indices.map((i) => currentQ.options[i]);
    const newCorrectIndex = indices.indexOf(currentQ.correct_index);
    return { shuffledOptions: shuffled, shuffledCorrectIndex: newCorrectIndex };
  }, [questions, currentQuestionIndex]);

  const handleTimeout = () => {
    setIsAnswered(true);
    // Auto-proceed logic could go here, or just show wrong answer
  };

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === shuffledCorrectIndex) {
      setScore((s) => s + 10); // 10 points per question
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(30);
      setIsAnswered(false);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Generating Quiz
          </h3>
          <p className="text-slate-400">
            Analyzing {conceptLabel} and crafting questions...
          </p>
        </div>
      </div>,
      document.body,
    );
  }

  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
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

  // Finished State
  if (isFinished) {
    const percentage = Math.round((score / (questions.length * 10)) * 100);
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-linear-to-b from-blue-500/10 to-transparent pointer-events-none" />

          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />

          <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-slate-400 mb-8">
            You scored {score} points ({percentage}%)
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Total Questions
              </div>
              <div className="text-2xl font-semibold text-white">
                {questions.length}
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Correct Answers
              </div>
              <div className="text-2xl font-semibold text-green-400">
                {score / 10}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20">
            Close Quiz
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">
              Quiz: {conceptLabel}
            </h2>
            <div className="text-sm text-slate-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-sm font-medium">
              <Trophy className="w-4 h-4" />
              <span>{score} pts</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-800 w-full">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="flex justify-between items-start gap-4 mb-6">
            <h3 className="text-xl font-medium text-white leading-relaxed">
              {currentQuestion.question}
            </h3>
            <div
              className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full border-4 text-sm font-bold transition-colors ${
                timeLeft <= 5
                  ? "border-red-500/50 text-red-400"
                  : "border-slate-700 text-slate-400"
              }`}>
              {timeLeft}
            </div>
          </div>

          <div className="space-y-3">
            {shuffledOptions.map((option, idx) => {
              let stateClass =
                "border-slate-700 hover:bg-slate-800 text-slate-300";
              if (isAnswered) {
                if (idx === shuffledCorrectIndex) {
                  stateClass =
                    "border-green-500/50 bg-green-500/10 text-green-400";
                } else if (idx === selectedOption) {
                  stateClass = "border-red-500/50 bg-red-500/10 text-red-400";
                } else {
                  stateClass = "border-slate-700 opacity-50";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleOptionClick(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 font-medium ${stateClass}`}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                        isAnswered && idx === shuffledCorrectIndex
                          ? "border-green-500 bg-green-500 text-black"
                          : "border-current opacity-50"
                      }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    {option}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation / Footer */}
          {isAnswered && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div
                className={`p-4 rounded-xl border ${
                  selectedOption === shuffledCorrectIndex
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}>
                <div className="flex items-start gap-3">
                  {selectedOption === shuffledCorrectIndex ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  )}
                  <div>
                    <div
                      className={`font-semibold mb-1 ${
                        selectedOption === shuffledCorrectIndex
                          ? "text-green-400"
                          : "text-red-400"
                      }`}>
                      {selectedOption === shuffledCorrectIndex
                        ? "Correct!"
                        : "Incorrect"}
                    </div>
                    <p className="text-slate-300 leading-relaxed text-sm">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                  {currentQuestionIndex + 1 === questions.length
                    ? "Finish Quiz"
                    : "Next Question"}
                  <Timer className="w-4 h-4 opacity-50" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
