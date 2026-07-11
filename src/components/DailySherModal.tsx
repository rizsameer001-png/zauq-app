import React, { useState, useEffect } from "react";
import { 
  X, 
  Heart, 
  Palette, 
  Copy, 
  Check, 
  Sparkles, 
  BookOpen, 
  Quote,
  Volume2
} from "lucide-react";
import { Sher, Ghazal } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface DailySherModalProps {
  ghazals: Ghazal[];
  onSaveSher: (sher: Sher) => void;
  savedSherIds: string[];
  onRemoveSher?: (id: string) => void;
  onEditInCardCreator: (sher: Sher) => void;
}

export default function DailySherModal({
  ghazals,
  onSaveSher,
  savedSherIds,
  onRemoveSher,
  onEditInCardCreator
}: DailySherModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSher, setCurrentSher] = useState<Sher | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true); // Default show explanation in popup for rich content

  const { speak, stop, isSpeaking, currentSpeakingId } = useSpeechSynthesis();

  // Stop speaking when modal closes
  useEffect(() => {
    if (!isOpen) {
      stop();
    }
  }, [isOpen]);

  const handleRecite = () => {
    if (!currentSher) return;
    if (currentSpeakingId === currentSher.id && isSpeaking) {
      stop();
    } else {
      speak(currentSher.id, currentSher.urdu);
    }
  };

  // Extract all shers across all available ghazals
  const getAllShers = (): Sher[] => {
    const list: Sher[] = [];
    ghazals.forEach((g) => {
      if (g.shers && g.shers.length > 0) {
        g.shers.forEach((s) => {
          list.push({
            ...s,
            poet: s.poet || g.poet
          });
        });
      }
    });
    return list;
  };

  // Select a deterministic daily sher based on current date
  const getDeterministicDailySher = (shersList: Sher[]): Sher | null => {
    if (shersList.length === 0) return null;
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    // Hash function
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    
    const index = Math.abs(hash) % shersList.length;
    return shersList[index];
  };

  // Determine if we should show the modal automatically on load
  useEffect(() => {
    const shers = getAllShers();
    if (shers.length > 0) {
      const daily = getDeterministicDailySher(shers);
      setCurrentSher(daily);

      // Check if user has already seen today's daily sher modal
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      const storageKey = `zauq_daily_seen_${dateStr}`;
      
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        // Automatically open the modal
        setIsOpen(true);
        // Mark as seen so it doesn't pop up on subsequent refreshes on the same day
        localStorage.setItem(storageKey, "true");
      }
    }
  }, [ghazals]);

  if (!currentSher) return null;

  const isSaved = savedSherIds.includes(currentSher.id);

  // Toggle Favorite
  const handleToggleFavorite = () => {
    if (isSaved) {
      if (onRemoveSher) onRemoveSher(currentSher.id);
    } else {
      onSaveSher(currentSher);
    }
  };

  // Copy couplet text
  const handleCopy = () => {
    const textToCopy = `${currentSher.urdu}\n\n${currentSher.roman || ""}\n\n"${currentSher.english || ""}"\n— ${currentSher.poet}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md" id="daily-sher-modal-overlay">
          {/* Backdrop click to close */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-default"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-500/15 bg-gradient-to-b from-stone-900 to-stone-950 p-6 md:p-8 shadow-2xl z-10"
            id="daily-sher-modal-container"
          >
            {/* Elegant Ornamental Borders */}
            <div className="absolute inset-2.5 border border-amber-500/[0.04] rounded-2xl pointer-events-none" />
            <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-850 text-stone-500 hover:text-stone-300 transition-colors cursor-pointer z-20"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6 border-b border-stone-850 pb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Quote className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/80 font-bold block">
                  Morning Reflection
                </span>
                <h3 className="text-base font-serif font-semibold text-amber-100">
                  Featured Couplet of the Day
                </h3>
              </div>
            </div>

            {/* Couplet Body Display */}
            <div className="flex flex-col items-center text-center gap-6 py-6 my-2">
              <p 
                className="text-2.5xl md:text-4xl font-urdu text-amber-100 leading-[1.8] font-bold font-serif whitespace-pre-line tracking-wide drop-shadow-md select-all"
                dir="rtl"
              >
                {currentSher.urdu}
              </p>

              <div className="flex flex-col gap-1 px-4 max-w-xl">
                {currentSher.roman && (
                  <p className="text-xs md:text-sm italic text-stone-400/80 tracking-wide font-serif leading-relaxed">
                    {currentSher.roman}
                  </p>
                )}
                {currentSher.english && (
                  <p className="text-sm md:text-base text-stone-300 tracking-wide font-serif leading-relaxed mt-1">
                    "{currentSher.english}"
                  </p>
                )}
                <p className="text-xs font-mono uppercase tracking-widest text-amber-500/70 font-semibold mt-2.5">
                  — {currentSher.poet}
                </p>
              </div>
            </div>

            {/* Ustaad's Commentary / Explanation Panel */}
            {currentSher.explanation && showExplanation && (
              <div className="bg-stone-950/65 border border-amber-500/5 rounded-2xl p-4 md:p-5 mb-6">
                <h5 className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tashreeh / Metaphysical Essence</span>
                </h5>
                <p className="text-xs text-stone-400 font-serif leading-relaxed italic whitespace-pre-line">
                  {currentSher.explanation}
                </p>
              </div>
            )}

            {/* Footer Control Tray */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-850 pt-5">
              {/* Reset Auto-show button or info hint */}
              <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                <span>Featured automatically once a day</span>
              </div>

              {/* Utility buttons */}
              <div className="flex items-center gap-2">
                {/* Listen Recitation TTS */}
                <button
                  onClick={handleRecite}
                  className={`px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-mono font-medium ${
                    currentSher && currentSpeakingId === currentSher.id && isSpeaking
                      ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400"
                      : "bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-amber-400 border border-stone-800"
                  }`}
                  title={currentSher && currentSpeakingId === currentSher.id && isSpeaking ? "Stop recitation" : "Listen to Urdu recitation"}
                >
                  <Volume2 className={`w-4 h-4 ${currentSher && currentSpeakingId === currentSher.id && isSpeaking ? "animate-pulse" : ""}`} />
                  <span className="hidden sm:inline">{currentSher && currentSpeakingId === currentSher.id && isSpeaking ? "Reciting..." : "Listen"}</span>
                </button>

                {/* Design with Card Creator */}
                <button
                  onClick={() => {
                    onEditInCardCreator(currentSher);
                    setIsOpen(false);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-amber-400 border border-stone-800 transition-all cursor-pointer flex items-center gap-2 text-xs font-mono font-medium"
                  title="Design with Card Creator"
                >
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Design Card</span>
                </button>

                {/* Copy Text */}
                <button
                  onClick={handleCopy}
                  className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-amber-400 border border-stone-800 transition-all cursor-pointer"
                  title="Copy couplet text"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                {/* Save to Deewan (Main Feature Button) */}
                <button
                  onClick={handleToggleFavorite}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all cursor-pointer text-xs font-mono uppercase tracking-wider font-bold shadow-md ${
                    isSaved
                      ? "bg-rose-950/20 border-rose-900/40 text-rose-400 hover:bg-rose-950/35"
                      : "bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-400 hover:border-amber-300"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? "fill-current text-rose-400" : ""}`} />
                  <span>{isSaved ? "Saved" : "Save to Deewan"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
