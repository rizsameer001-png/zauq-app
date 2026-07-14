import React, { useState, useEffect } from "react";
import { Sparkles, Globe, FileText, Compass, History, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { Sher } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface Metaphor {
  word: string;
  meaning: string;
  poeticSymbolism: string;
}

interface Interpretation {
  language: string;
  translation: string;
  explanation: string;
}

interface InterpretationData {
  poetName: string;
  interpretations: Interpretation[];
  metaphors: Metaphor[];
  historicalContext: string;
}

interface SherInterpretationModalProps {
  sher: Sher;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export default function SherInterpretationModal({
  sher,
  onClose,
  triggerToast
}: SherInterpretationModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InterpretationData | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>("English");

  const languages = ["English", "Urdu (اردو)", "Persian (فارسی)", "Turkish (Türkçe)"];

  useEffect(() => {
    let active = true;
    const fetchInterpretation = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/gemini/sher-interpretation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            urdu: sher.urdu,
            roman: sher.roman,
            english: sher.english,
            poet: sher.poet,
            languages
          })
        });

        if (!response.ok) {
          throw new Error("Failed to consult the literary mentor archives.");
        }

        const resData = await response.json();
        if (active) {
          setData(resData);
          // Set active language to the first available or English
          if (resData.interpretations && resData.interpretations.length > 0) {
            setActiveLanguage(resData.interpretations[0].language);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch interpretation:", err);
        if (active) {
          setError(err.message || "An error occurred while calling Gemini.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchInterpretation();

    return () => {
      active = false;
    };
  }, [sher]);

  const activeInterpretation = data?.interpretations.find(
    (i) => i.language.toLowerCase().includes(activeLanguage.split(" ")[0].toLowerCase())
  );

  return (
    <div id="sher-interpretation-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-stone-900 border border-stone-850 w-full max-w-3xl rounded-3xl p-5 md:p-8 flex flex-col gap-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-interpretation-modal"
          className="absolute top-5 right-5 text-stone-500 hover:text-stone-300 hover:bg-stone-800/40 p-2 rounded-full transition-all text-xs font-mono cursor-pointer"
        >
          ✕ Close
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 border-b border-stone-800/60 pb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-serif font-semibold text-amber-200">
              Sher Tafseer-e-Zauq (AI Poetic Translation & Interpretation)
            </h3>
            <p className="text-stone-400 text-xs font-mono">
              Leveraging Gemini models to unlock classical metaphysical philosophy.
            </p>
          </div>
        </div>

        {/* Core Sher Display (Centered Classic Layout) */}
        <div id="sher-interpretation-card" className="bg-stone-950/40 border border-stone-900 rounded-2xl p-6 text-center space-y-4 shadow-inner">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 font-semibold block">
            Selected Couplet
          </span>
          <p className="text-2xl md:text-3xl text-amber-100 font-serif leading-loose tracking-wide whitespace-pre-line dir-rtl font-urdu">
            {sher.urdu}
          </p>
          <div className="space-y-1">
            <p className="italic text-xs text-stone-400 font-serif leading-relaxed px-4">
              {sher.roman}
            </p>
            <p className="text-stone-300 text-sm font-serif leading-relaxed px-4 max-w-xl mx-auto">
              "{sher.english}"
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 rounded-full bg-stone-900 border border-stone-850 text-[11px] font-medium text-stone-400">
              — {sher.poet}
            </span>
          </div>
        </div>

        {/* Interactive Workspace */}
        <div className="flex-1 flex flex-col gap-5 min-h-[300px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-500 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-mono text-stone-300 uppercase tracking-widest animate-pulse">
                  Unveiling the Celestial Archives...
                </p>
                <p className="text-[11px] text-stone-500 font-serif max-w-sm">
                  Ustaad-e-Zauq is interpreting the Sufi and romantic depth of this couplet in multiple languages. Please wait.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-950/20 border border-red-900/30 p-5 rounded-2xl flex gap-3 text-stone-400 text-xs">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-stone-300">Interpretation System Unavailable</p>
                <p>{error}</p>
                <p className="text-stone-500 text-[11px]">
                  Unable to connect to the server's AI model. Showing offline fallbacks instead.
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Language Selection Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-stone-850 pb-3" id="interpretation-lang-tabs">
                {data?.interpretations.map((interpretation) => {
                  const isSelected = activeLanguage.toLowerCase().includes(
                    interpretation.language.split(" ")[0].toLowerCase()
                  );
                  return (
                    <button
                      key={interpretation.language}
                      onClick={() => setActiveLanguage(interpretation.language)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-md"
                          : "bg-stone-900/50 border border-transparent text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{interpretation.language}</span>
                    </button>
                  );
                })}
              </div>

              {/* Translation & Explanation Display */}
              <AnimatePresence mode="wait">
                {activeInterpretation && (
                  <motion.div
                    key={activeLanguage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {/* Poetic Transliteration/Translation */}
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono uppercase text-amber-500 font-bold block">
                        Poetic Translation ({activeLanguage})
                      </span>
                      <p className="text-sm font-serif text-stone-200 italic leading-relaxed">
                        "{activeInterpretation.translation}"
                      </p>
                    </div>

                    {/* Detailed Explanation */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono uppercase text-stone-500 tracking-wider font-bold block flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Detailed Tafseer (Explanation)</span>
                      </span>
                      <p className="text-xs text-stone-300 font-serif leading-relaxed whitespace-pre-line bg-stone-950/15 p-4 rounded-xl border border-stone-850/40">
                        {activeInterpretation.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Metaphors Breakdown Grid */}
              {data?.metaphors && data.metaphors.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[9px] font-mono uppercase text-stone-500 tracking-wider font-bold block flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Ramz-o-Alamat (Key Metaphors & Poetic Symbols)</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="metaphors-grid">
                    {data.metaphors.map((meta, i) => (
                      <div
                        key={i}
                        className="p-3 bg-stone-950/25 border border-stone-850/50 rounded-xl hover:border-stone-800 transition-all flex flex-col gap-1 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-serif font-bold text-amber-400 font-urdu">
                            {meta.word}
                          </span>
                          <span className="text-[9px] font-mono text-stone-500 uppercase">
                            {meta.meaning}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 font-serif leading-relaxed">
                          {meta.poeticSymbolism}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historical Context Section */}
              {data?.historicalContext && (
                <div className="p-4 bg-stone-950/35 border border-stone-850/60 rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[9px] font-mono uppercase text-stone-500 tracking-wider font-bold block flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-amber-500/70" />
                    <span>Tareekhi Pas-Manzar (Historical & Poet's Era Context)</span>
                  </span>
                  <p className="text-[11px] text-stone-400 font-serif leading-relaxed">
                    {data.historicalContext}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
