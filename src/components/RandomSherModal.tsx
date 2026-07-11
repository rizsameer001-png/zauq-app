import React, { useState, useEffect } from "react";
import { 
  X, 
  Heart, 
  Palette, 
  Copy, 
  Check, 
  Sparkles, 
  Quote,
  Volume2,
  Shuffle
} from "lucide-react";
import { Sher, Ghazal } from "../types";
import { STARTER_SHERS } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface RandomSherModalProps {
  isOpen: boolean;
  onClose: () => void;
  ghazals: Ghazal[];
  onSaveSher: (sher: Sher) => void;
  savedSherIds: string[];
  onRemoveSher: (id: string) => void;
  onEditInCardCreator: (sher: Sher) => void;
}

export default function RandomSherModal({
  isOpen,
  onClose,
  ghazals,
  onSaveSher,
  savedSherIds,
  onRemoveSher,
  onEditInCardCreator
}: RandomSherModalProps) {
  const [currentSher, setCurrentSher] = useState<Sher | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);

  const { speak, stop, isSpeaking, currentSpeakingId } = useSpeechSynthesis();

  // Stop speaking when modal closes
  useEffect(() => {
    if (!isOpen) {
      stop();
    }
  }, [isOpen]);

  // Extract all shers across all available ghazals or fallback to STARTER_SHERS
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
    return list.length > 0 ? list : STARTER_SHERS;
  };

  const selectRandomSher = () => {
    const shers = getAllShers();
    if (shers.length === 0) return;
    
    setIsShuffling(true);
    stop(); // Stop any reading if playing

    // Set a timeout to simulate a suspenseful "rolling" shuffle animation
    setTimeout(() => {
      let nextSher = shers[Math.floor(Math.random() * shers.length)];
      // Try to avoid showing the exact same sher if possible
      if (currentSher && shers.length > 1) {
        while (nextSher.id === currentSher.id) {
          nextSher = shers[Math.floor(Math.random() * shers.length)];
        }
      }
      setCurrentSher(nextSher);
      setIsShuffling(false);
    }, 600);
  };

  // Select a random sher upon opening the modal
  useEffect(() => {
    if (isOpen) {
      const shers = getAllShers();
      if (shers.length > 0) {
        const initialSher = shers[Math.floor(Math.random() * shers.length)];
        setCurrentSher(initialSher);
      }
    } else {
      setCurrentSher(null);
    }
  }, [isOpen, ghazals]);

  if (!isOpen || !currentSher) return null;

  const isSaved = savedSherIds.includes(currentSher.id);

  const trackInteraction = (sher: Sher) => {
    try {
      const stored = localStorage.getItem("zauq_recently_viewed");
      let list: Sher[] = [];
      if (stored) {
        list = JSON.parse(stored);
      }
      const filtered = list.filter((s) => s.id !== sher.id);
      const next = [sher, ...filtered].slice(0, 5);
      localStorage.setItem("zauq_recently_viewed", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("zauq_recently_viewed_update"));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = () => {
    trackInteraction(currentSher);
    if (isSaved) {
      onRemoveSher(currentSher.id);
    } else {
      onSaveSher(currentSher);
    }
  };

  const handleCopy = () => {
    trackInteraction(currentSher);
    const textToCopy = `${currentSher.urdu}\n\n${currentSher.roman || ""}\n\n"${currentSher.english || ""}"\n— ${currentSher.poet}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRecite = () => {
    trackInteraction(currentSher);
    if (currentSpeakingId === currentSher.id && isSpeaking) {
      stop();
    } else {
      speak(currentSher.id, currentSher.urdu);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md" id="random-sher-modal-overlay">
        {/* Backdrop click to close */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-500/15 bg-gradient-to-b from-stone-900 to-stone-950 p-6 md:p-8 shadow-2xl z-10"
          id="random-sher-modal-container"
        >
          {/* Elegant Ornamental Borders */}
          <div className="absolute inset-2.5 border border-amber-500/[0.04] rounded-2xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-850 text-stone-500 hover:text-stone-300 transition-colors cursor-pointer z-20"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6 border-b border-stone-850 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/80 font-bold block">
                  Intikhab-e-Ghaib (Random Selection)
                </span>
                <h3 className="text-base font-serif font-semibold text-amber-100">
                  Wandering through the Deewan...
                </h3>
              </div>
            </div>

            {/* Next Random button */}
            <button
              onClick={selectRandomSher}
              disabled={isShuffling}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl px-3 py-1.5 text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
            >
              <Shuffle className={`w-3.5 h-3.5 ${isShuffling ? "animate-spin" : ""}`} />
              <span>Next Random</span>
            </button>
          </div>

          {/* Couplet Body Display with sliding/fade animation on change */}
          <AnimatePresence mode="wait">
            {!isShuffling ? (
              <motion.div
                key={currentSher.id}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center text-center gap-6 py-6 my-2"
              >
                <div className="relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-20">
                    <Quote className="w-12 h-12 text-amber-500/30 font-serif" />
                  </div>
                  <p 
                    className="text-2.5xl md:text-4xl font-urdu text-amber-100 leading-[1.8] font-bold font-serif whitespace-pre-line tracking-wide drop-shadow-md select-all relative z-10"
                    dir="rtl"
                  >
                    {currentSher.urdu}
                  </p>
                </div>

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
                </div>

                {/* Poet Calligraphy Style Banner */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/60">
                    Kalaam-e-Sha'ir
                  </span>
                  <div className="px-3.5 py-1 rounded-full border border-stone-800 bg-stone-900/60 text-xs text-amber-300 font-serif font-medium tracking-wide">
                    — {currentSher.poet}
                  </div>
                </div>

                {/* Optional Explanation Toggle */}
                {currentSher.explanation && (
                  <div className="w-full max-w-lg mt-2 pt-4 border-t border-stone-850 text-left">
                    <button
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="text-[10px] font-mono uppercase tracking-widest text-stone-500 hover:text-amber-500/80 transition-colors mx-auto block cursor-pointer"
                    >
                      {showExplanation ? "Hide Commentary ✕" : "Show Commentary ❯"}
                    </button>
                    
                    <AnimatePresence>
                      {showExplanation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-3"
                        >
                          <div className="bg-stone-900/40 border border-stone-900 rounded-2xl p-4 text-xs text-stone-400 leading-relaxed font-serif text-center italic">
                            {currentSher.explanation}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4" key="shuffling">
                <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-xs font-serif text-stone-500 italic">Unrolling scrolls of high poetry...</p>
              </div>
            )}
          </AnimatePresence>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-4 border-t border-stone-850">
            {/* Recite (Speech Synthesis) */}
            <button
              onClick={handleRecite}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border cursor-pointer ${
                currentSpeakingId === currentSher.id && isSpeaking
                  ? "bg-amber-500 border-amber-400 text-stone-950 animate-pulse"
                  : "bg-stone-900/80 hover:bg-stone-850 border-stone-800 text-stone-300 hover:text-amber-200"
              }`}
              title="Hear standard recitation"
            >
              <Volume2 className="w-4 h-4" />
              <span>{currentSpeakingId === currentSher.id && isSpeaking ? "Mute Recital" : "Recite Word"}</span>
            </button>

            {/* Save (Favorite) Toggle */}
            <button
              onClick={handleToggleFavorite}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border cursor-pointer ${
                isSaved
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                  : "bg-stone-900/80 hover:bg-stone-850 border-stone-800 text-stone-300 hover:text-amber-200"
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? "fill-amber-500 text-amber-500" : ""}`} />
              <span>{isSaved ? "Saved" : "Save Sher"}</span>
            </button>

            {/* Copy to Clipboard */}
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-amber-200 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? "Copied!" : "Copy Text"}</span>
            </button>

            {/* Design Card Creator */}
            <button
              onClick={() => {
                trackInteraction(currentSher);
                onEditInCardCreator(currentSher);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span>Customize Card</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
